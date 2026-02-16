// backend/services/statCalculationService.js
const fs = require('node:fs/promises');
const path = require('node:path');
const exerciseCatalogService = require('./exerciseCatalogService');

const EPLEY_CONSTANT = 30;
const STAT_CAP_RAW_MAX = 1000; // Max value after initial normalization, before sigmoid

const EXPECTED_STAT_CAPS = {
    upperBodyStrength: 2000,
    lowerBodyStrength: 3000,
    coreStrength: 1500,
    powerExplosiveness: 1800,
    // Vitality removed
};

// Tracked stats list - source of truth for stats we process (camelCase)
const TRACKED_STATS = [
    "upperBodyStrength",
    "lowerBodyStrength",
    "coreStrength",
    "powerExplosiveness",
    "cardioEndurance",
    "flexibilityMobility"
];

// Sigmoid function for smooth RPG-like leveling curve
function sigmoidScaled(x, maxVal = STAT_CAP_RAW_MAX, slope = 0.005) {
    // Scales output to be between 1 and 1000 (or 1 and maxVal if 1000 is not the target)
    // The - (maxVal / 2) part centers the sigmoid around the midpoint of the stat range.
    // Slope adjusts the steepness of the curve.
    const val = 1 + (maxVal -1) / (1 + Math.exp(-slope * (x - (maxVal / 2))));
    return Math.round(val);
}

// Calculates 1 Rep Max (1RM) using Epley's formula
function calculateOneRm(weight, reps) {
    if (reps === 0) return 0; // Avoid division by zero and handle no-rep cases
    if (reps === 1) return weight; // Standard 1RM
    return weight * (1 + reps / EPLEY_CONSTANT);
}

// Function to load stat_weights.json
async function loadStatWeights() {
    const weightsPath = path.join(__dirname, '../data/stat_weights.json'); // Updated path
    try {
        const data = await fs.readFile(weightsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading stat_weights.json:', error);
        throw new Error('Could not load stat weights configuration.');
    }
}

function toWeightKey(value = '') {
    return String(value).toLowerCase().trim();
}

function toLegacyEquipmentKeys(equipmentValue) {
    if (!equipmentValue) return [];
    const source = Array.isArray(equipmentValue) ? equipmentValue : [equipmentValue];
    const aliases = new Set();

    const aliasMap = {
        body_only: ['body only'],
        foam_roll: ['foam roll'],
        exercise_ball: ['exercise ball'],
        medicine_ball: ['medicine ball'],
        ez_curl_bar: ['e-z curl bar'],
        cable_stack: ['cable', 'machine'],
        kettlebell: ['kettlebells'],
    };

    for (const raw of source) {
        const key = toWeightKey(raw);
        aliases.add(key);
        aliases.add(key.replace(/_/g, ' '));
        for (const mapped of aliasMap[key] || []) {
            aliases.add(mapped);
        }
    }

    return [...aliases];
}

function isDurationDoseType(doseType = '') {
    return ['time', 'distance', 'intervals', 'holds'].includes(toWeightKey(doseType));
}

function isRepDoseType(doseType = '') {
    return ['reps', 'contacts'].includes(toWeightKey(doseType));
}

function isExerciseRelevantForStat(exerciseInfo, camelCaseStatName, statWeights) {
    if (!exerciseInfo || !camelCaseStatName || !statWeights) return false;

    // Check primary muscles
    for (const muscle of exerciseInfo.primaryMuscles || []) {
        if (statWeights.muscles?.[muscle]?.[camelCaseStatName]) return true;
    }
    // Check secondary muscles
    for (const muscle of exerciseInfo.secondaryMuscles || []) {
        if (statWeights.muscles?.[muscle]?.[camelCaseStatName]) return true;
    }
    // Check mechanic
    if (exerciseInfo.mechanic && statWeights.mechanic?.[toWeightKey(exerciseInfo.mechanic)]?.[camelCaseStatName]) return true;
    // Check modality and doseType if configured
    if (exerciseInfo.modality && statWeights.modality?.[toWeightKey(exerciseInfo.modality)]?.[camelCaseStatName]) return true;
    if (exerciseInfo.doseType && statWeights.doseType?.[toWeightKey(exerciseInfo.doseType)]?.[camelCaseStatName]) return true;
    // Check movement patterns if configured
    for (const pattern of exerciseInfo.movementPatterns || []) {
        if (statWeights.movementPatterns?.[toWeightKey(pattern)]?.[camelCaseStatName]) return true;
    }
    // Check equipment array (v2) and legacy aliases
    for (const equipmentKey of toLegacyEquipmentKeys(exerciseInfo.equipment)) {
        if (statWeights.equipment?.[equipmentKey]?.[camelCaseStatName]) return true;
    }

    return false;
}


// Main function to calculate POTENTIAL stats
async function calculatePotentialStats(userExerciseHistory, exerciseDbData, statWeights) { // Renamed and statWeights passed in
    const initialPotentialStats = TRACKED_STATS.reduce((acc, stat) => {
        acc[stat] = null; // Initialize all potential stats to null
        return acc;
    }, {});

    if (!userExerciseHistory || userExerciseHistory.length === 0) {
        console.log('No exercise history provided, returning null potential stats.');
        return { ...initialPotentialStats, detailedContributions: {} };
    }

    // const statWeights = await loadStatWeights(); // Now passed as argument

    const exerciseMetadataMap = new Map();
    for (const ex of exerciseDbData) {
        exerciseMetadataMap.set(ex.name.toLowerCase(), ex);
    }

    // 1. Count relevant exercises for each stat & Identify Strongest Lifts
    const relevantExerciseCounts = TRACKED_STATS.reduce((acc, stat) => {
        acc[stat] = new Set(); // Use a Set to count unique exercise types relevant to the stat
        return acc;
    }, {});
    const strongestLifts = {}; // Store strongest lift for each exercise type (name)

    for (const loggedEx of userExerciseHistory) {
        if (!loggedEx.type) {
            continue;
        }

        const exerciseNameLower = loggedEx.type.toLowerCase();
        const exerciseInfo = exerciseMetadataMap.get(exerciseNameLower);

        if (!exerciseInfo) {
            continue;
        }

        // Count relevance for the 5-exercise rule
        for (const statName of TRACKED_STATS) {
            if (isExerciseRelevantForStat(exerciseInfo, statName, statWeights)) {
                relevantExerciseCounts[statName].add(exerciseInfo.name); // Add exercise name (unique type)
            }
        }

        // v2 1RM gating: only rep-based strength/power movements can produce 1RM values.
        const modality = toWeightKey(exerciseInfo.modality);
        if (!isRepDoseType(exerciseInfo.doseType) || !['strength', 'power'].includes(modality)) {
            continue;
        }

        const firstSet = Array.isArray(loggedEx.sets) ? loggedEx.sets[0] : null;
        const reps = Number(firstSet?.reps ?? loggedEx.reps);
        const weight = Number(firstSet?.weight ?? loggedEx.weight);
        if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
            continue;
        }

        const oneRm = calculateOneRm(weight, reps);
        if (!strongestLifts[exerciseInfo.name] || oneRm > strongestLifts[exerciseInfo.name].oneRm) {
            strongestLifts[exerciseInfo.name] = {
                name: exerciseInfo.name,
                oneRm: oneRm,
                primaryMuscles: exerciseInfo.primaryMuscles || [],
                secondaryMuscles: exerciseInfo.secondaryMuscles || [],
                mechanic: exerciseInfo.mechanic,
                modality: exerciseInfo.modality,
                movementPatterns: exerciseInfo.movementPatterns || [],
                doseType: exerciseInfo.doseType,
                level: exerciseInfo.level, // This is difficulty
                equipment: exerciseInfo.equipment,
            };
        }
    }

    const processedStrongestLifts = Object.values(strongestLifts);

    if (processedStrongestLifts.length === 0) {
        console.log('No 1RM-relevant strongest lifts found after filtering for potential calculation.');
        return { ...initialPotentialStats, detailedContributions: {} };
    }

    // Initialize rawStats and detailedContributions
    const rawStats = TRACKED_STATS.reduce((acc, stat) => {
        acc[stat] = 0;
        return acc;
    }, {});
    const detailedContributions = {};

    // 2. Build Weighted Stat Vectors for Strongest Lifts & 3. Apply Lift Value & Aggregate Raw Stats
    for (const lift of processedStrongestLifts) {
        const liftStatContributions = {}; // Stores contributions for THIS lift, using camelCase keys

        // Iterate over categories of stat weights (muscles, force, etc.)
        // Primary Muscles (100% weight)
        for (const muscle of lift.primaryMuscles || []) {
            if (statWeights.muscles?.[muscle]) {
                for (const [statName, weight] of Object.entries(statWeights.muscles[muscle])) {
                    if (TRACKED_STATS.includes(statName)) {
                        liftStatContributions[statName] = (liftStatContributions[statName] || 0) + weight;
                    }
                }
            }
        }

        // Secondary Muscles (50% weight)
        for (const muscle of lift.secondaryMuscles || []) {
            if (statWeights.muscles?.[muscle]) {
                for (const [statName, weight] of Object.entries(statWeights.muscles[muscle])) {
                    if (TRACKED_STATS.includes(statName)) {
                        liftStatContributions[statName] = (liftStatContributions[statName] || 0) + (weight * 0.5);
                    }
                }
            }
        }

        // Other categories: mechanic/modality/doseType and movement patterns
        const categoryPairs = [
            ['mechanic', lift.mechanic],
            ['modality', lift.modality],
            ['doseType', lift.doseType],
        ];
        for (const [categoryKey, liftPropertyValue] of categoryPairs) {
            if (liftPropertyValue && statWeights[categoryKey]?.[toWeightKey(liftPropertyValue)]) {
                for (const [statName, weight] of Object.entries(statWeights[categoryKey][toWeightKey(liftPropertyValue)])) {
                    if (TRACKED_STATS.includes(statName)) {
                        liftStatContributions[statName] = (liftStatContributions[statName] || 0) + weight;
                    }
                }
            }
        }
        for (const pattern of lift.movementPatterns || []) {
            const movementWeights = statWeights.movementPatterns?.[toWeightKey(pattern)];
            if (!movementWeights) continue;
            for (const [statName, weight] of Object.entries(movementWeights)) {
                if (TRACKED_STATS.includes(statName)) {
                    liftStatContributions[statName] = (liftStatContributions[statName] || 0) + weight;
                }
            }
        }
        for (const equipmentKey of toLegacyEquipmentKeys(lift.equipment)) {
            const equipmentWeights = statWeights.equipment?.[equipmentKey];
            if (!equipmentWeights) continue;
            for (const [statName, weight] of Object.entries(equipmentWeights)) {
                if (TRACKED_STATS.includes(statName)) {
                    liftStatContributions[statName] = (liftStatContributions[statName] || 0) + weight;
                }
            }
        }

        const difficultyMultiplier = getDifficultyMultiplier(lift);
        for (const [statName, contributionWeight] of Object.entries(liftStatContributions)) {
            if (rawStats.hasOwnProperty(statName)) {
                const points = lift.oneRm * contributionWeight * difficultyMultiplier;
                rawStats[statName] += points;

                if (!detailedContributions[statName]) {
                    detailedContributions[statName] = [];
                }
                detailedContributions[statName].push({
                    exerciseName: lift.name,
                    pointsContribution: parseFloat(points.toFixed(2))
                });
            }
        }
    }

    const finalPotentialStats = { ...initialPotentialStats };

    for (const statName of TRACKED_STATS) {
        if (statName === 'cardioEndurance' || statName === 'flexibilityMobility') {
            finalPotentialStats[statName] = 1000;
            continue;
        }
        // Apply 5-exercise rule
        if (relevantExerciseCounts[statName].size < 5) {
            finalPotentialStats[statName] = null; // Keep as null if not enough relevant exercises
            if (detailedContributions[statName]) delete detailedContributions[statName]; // Remove contributions if stat is N/A
            console.log(`Stat ${statName} has ${relevantExerciseCounts[statName].size} relevant exercises. Needs 5. Potential set to null.`);
            continue;
        }

        const currentRawStat = rawStats[statName];
        const expectedCap = EXPECTED_STAT_CAPS[statName];

        let normalizedStat = 1;
        if (expectedCap && expectedCap > 0 && currentRawStat > 0) {
            const ratio = Math.min(1, currentRawStat / expectedCap);
            normalizedStat = Math.round(ratio * STAT_CAP_RAW_MAX);
        } else if (currentRawStat <= 0) {
            normalizedStat = 1;
        }
        normalizedStat = Math.min(STAT_CAP_RAW_MAX, Math.max(1, normalizedStat));
        finalPotentialStats[statName] = sigmoidScaled(normalizedStat, STAT_CAP_RAW_MAX);
    }

    console.log('Final potential stats calculated:', finalPotentialStats);

    return {
        ...finalPotentialStats,
        detailedContributions: detailedContributions,
        // For XP calculation, it might be useful to also return strongestLifts by exercise type
        // This can be used for the effortFactor calculation later.
        strongestLiftsByExercise: strongestLifts
    };
}

// --- XP and Progression Functions ---

// Scaling function for XP needed for next stat increment
function getXpToNext(currentStatValue) {
    if (currentStatValue === null || currentStatValue < 0) return Infinity; // Should not happen if stat is active
    const base = 30; // XP needed at low levels
    const scale = 1.015; // How fast it ramps up
    return Math.round(base * Math.pow(scale, currentStatValue));
}

// Calculate XP awarded for a single logged exercise
function calculateXpForExercise(loggedExercise, exerciseMetadata, statWeights, strongestLiftsByExercise) {
    const awardedXp = TRACKED_STATS.reduce((acc, stat) => ({ ...acc, [stat]: 0 }), {});
    if (!loggedExercise || !exerciseMetadata || !statWeights) return awardedXp;

    const { sets = [], duration } = loggedExercise;
    const difficultyMultiplier = getDifficultyMultiplier(exerciseMetadata);
    const statWeighting = calculateStatWeighting(exerciseMetadata, statWeights);
    const doseType = toWeightKey(exerciseMetadata.doseType);

    if (isRepDoseType(doseType) && sets.length > 0) {
        const exerciseCanonicalName = exerciseMetadata.name;
        const userBest1RM = strongestLiftsByExercise?.[exerciseCanonicalName]?.oneRm ?? 0;

        sets.forEach(set => {
            const { weight, reps } = set;
            if (reps === undefined) return;
            const safeReps = Number(reps);
            if (!Number.isFinite(safeReps) || safeReps <= 0) return;
            const safeWeight = Number(weight);
            const canComputeRm = Number.isFinite(safeWeight) && safeWeight > 0;
            const currentLift1RM = canComputeRm ? calculateOneRm(safeWeight, safeReps) : 0;
            const effortFactor = canComputeRm && userBest1RM > 0 ? Math.min(1.0, currentLift1RM / userBest1RM) : 1.0;
            const baseXP = doseType === 'contacts' ? 4 : 5;
            const xpForSet = baseXP * difficultyMultiplier * effortFactor;

            for (const statName in statWeighting) {
                awardedXp[statName] += xpForSet * statWeighting[statName];
            }
        });
    } else if (isDurationDoseType(doseType)) {
        const durations = sets
            .map((set) => Number(set.duration))
            .filter((val) => Number.isFinite(val) && val > 0);
        if (!durations.length && Number.isFinite(Number(duration)) && Number(duration) > 0) {
            durations.push(Number(duration));
        }
        durations.forEach((seconds) => {
            const modalityBonus = toWeightKey(exerciseMetadata.modality) === 'conditioning' ? 1.2 : 1.0;
            const xpForSet = 8 * (seconds / 30) * difficultyMultiplier * modalityBonus;
            for (const statName in statWeighting) {
                awardedXp[statName] += xpForSet * statWeighting[statName];
            }
        });
    } else if (sets.length > 0) {
        for (const statName in statWeighting) {
            awardedXp[statName] += 3 * difficultyMultiplier * statWeighting[statName];
        }
    }

    // Round final XP values
    for (const statName in awardedXp) {
        awardedXp[statName] = Math.round(awardedXp[statName] * 100) / 100;
    }

    return awardedXp;
}

function getDifficultyMultiplier(exerciseMetadata) {
    if (!exerciseMetadata.level) return 1.0;
    const level = exerciseMetadata.level.toLowerCase();
    if (level === 'intermediate') return 1.25;
    if (level === 'expert' || level === 'advanced') return 1.5;
    return 1.0;
}

function calculateStatWeighting(exerciseMetadata, statWeights) {
    const weighting = TRACKED_STATS.reduce((acc, stat) => ({ ...acc, [stat]: 0 }), {});

    const applyWeight = (category, key, multiplier = 1) => {
        const weights = statWeights[category]?.[toWeightKey(key)];
        if (weights) {
            for (const statName in weights) {
                if (weighting.hasOwnProperty(statName)) {
                    weighting[statName] += weights[statName] * multiplier;
                }
            }
        }
    };

    (exerciseMetadata.primaryMuscles || []).forEach(muscle => applyWeight('muscles', muscle, 1));
    (exerciseMetadata.secondaryMuscles || []).forEach(muscle => applyWeight('muscles', muscle, 0.5));
    if (exerciseMetadata.mechanic) applyWeight('mechanic', exerciseMetadata.mechanic);
    if (exerciseMetadata.modality) applyWeight('modality', exerciseMetadata.modality);
    if (exerciseMetadata.doseType) applyWeight('doseType', exerciseMetadata.doseType);
    (exerciseMetadata.movementPatterns || []).forEach(pattern => applyWeight('movementPatterns', pattern, 0.75));
    toLegacyEquipmentKeys(exerciseMetadata.equipment).forEach(equipment => applyWeight('equipment', equipment));

    return weighting;
}

// Apply awarded XP to user's stats and handle leveling up
function applyXpAndLevelUp(currentUserStats, awardedXpMap) {
    console.log('[XP LOG] Entering applyXpAndLevelUp function.');
    console.log('[XP LOG] Current User Stats:', currentUserStats);
    console.log('[XP LOG] Awarded XP Map:', awardedXpMap);

    const updatedStats = JSON.parse(JSON.stringify(currentUserStats)); // Deep copy

    for (const statName of TRACKED_STATS) {
        const xpGained = awardedXpMap[statName] || 0;
        if (xpGained === 0) continue;

        const stat = updatedStats[statName];
        // Stat must have a potential value to gain XP and level up
        if (stat.potential === null || stat.current === null) {
            console.log(`[XP LOG] Stat ${statName} has no potential or current value, XP not applied.`);
            continue;
        }

        stat.xp += xpGained;

        while (stat.xp >= stat.xpToNext && stat.current < 1000) {
            stat.current += 1;
            stat.xp -= stat.xpToNext;
            stat.xpToNext = getXpToNext(stat.current);

            if (stat.current >= 1000) { // Reached global cap
                stat.current = 1000;
                stat.xp = 0; // Optional: clear XP or set to amount over last level
                stat.xpToNext = getXpToNext(1000); // Or Infinity, or some large number
                break;
            }
        }
         // Ensure XP doesn't go negative if somehow xpToNext was larger than xp
        if (stat.xp < 0) stat.xp = 0;
    }
    return updatedStats;
}


// Helper function to fetch the exercise DB data
async function fetchExerciseDb() {
    try {
        return await exerciseCatalogService.getExercises();
    } catch (error) {
        console.error('Error loading exercises_v2.json:', error);
        throw new Error('Could not load exercise database.');
    }
}

module.exports = {
    calculatePotentialStats,
    sigmoidScaled,
    calculateOneRm,
    loadStatWeights,
    fetchExerciseDb,
    getXpToNext,
    calculateXpForExercise,
    applyXpAndLevelUp,
    TRACKED_STATS // Exporting TRACKED_STATS
};
