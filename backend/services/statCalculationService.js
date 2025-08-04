// backend/services/statCalculationService.js
const fs = require('node:fs/promises');
const path = require('node:path');

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

// Helper function to check if an exercise is relevant to a specific stat
function isExerciseRelevantForStat(exerciseInfo, camelCaseStatName, statWeights) { //param renamed
    if (!exerciseInfo || !camelCaseStatName || !statWeights) return false;

    // Check primary muscles
    for (const muscle of exerciseInfo.primaryMuscles || []) {
        if (statWeights.muscles?.[muscle]?.[camelCaseStatName]) return true;
    }
    // Check secondary muscles
    for (const muscle of exerciseInfo.secondaryMuscles || []) {
        if (statWeights.muscles?.[muscle]?.[camelCaseStatName]) return true;
    }
    // Check force
    if (exerciseInfo.force && statWeights.force?.[exerciseInfo.force.toLowerCase()]?.[camelCaseStatName]) return true;
    // Check mechanic
    if (exerciseInfo.mechanic && statWeights.mechanic?.[exerciseInfo.mechanic.toLowerCase()]?.[camelCaseStatName]) return true;
    // Check equipment
    if (exerciseInfo.equipment && statWeights.equipment?.[exerciseInfo.equipment.toLowerCase()]?.[camelCaseStatName]) return true;

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
        if (!loggedEx.type || typeof loggedEx.weight !== 'number' || typeof loggedEx.reps !== 'number') {
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

        // Filter by category for 1RM calculation (for potential stats)
        const RMCategories = ["strength", "powerlifting", "olympic weightlifting", "strongman"];
        if (!exerciseInfo.category || !RMCategories.includes(exerciseInfo.category.toLowerCase())) {
            continue;
        }

        const oneRm = calculateOneRm(loggedEx.weight, loggedEx.reps);
        if (!strongestLifts[exerciseInfo.name] || oneRm > strongestLifts[exerciseInfo.name].oneRm) {
            strongestLifts[exerciseInfo.name] = {
                name: exerciseInfo.name,
                oneRm: oneRm,
                primaryMuscles: exerciseInfo.primaryMuscles || [],
                secondaryMuscles: exerciseInfo.secondaryMuscles || [],
                force: exerciseInfo.force,
                mechanic: exerciseInfo.mechanic,
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

        // Other categories: Force, Mechanic, Equipment
        const otherMetadataCategories = ['force', 'mechanic', 'equipment'];
        for (const categoryKey of otherMetadataCategories) { // e.g. categoryKey is 'force'
            const liftPropertyValue = lift[categoryKey]; // e.g. lift.force value like 'push'
            if (liftPropertyValue && statWeights[categoryKey]?.[liftPropertyValue.toLowerCase()]) {
                for (const [statName, weight] of Object.entries(statWeights[categoryKey][liftPropertyValue.toLowerCase()])) {
                    if (TRACKED_STATS.includes(statName)) {
                        liftStatContributions[statName] = (liftStatContributions[statName] || 0) + weight;
                    }
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

module.exports = {
    calculatePotentialStats, // Renamed
    sigmoidScaled,
    calculateOneRm,
    loadStatWeights,
    fetchExerciseDb
    // XP functions will be added here
};

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

    const { category, sets, duration } = loggedExercise;
    const difficultyMultiplier = getDifficultyMultiplier(exerciseMetadata);
    const statWeighting = calculateStatWeighting(exerciseMetadata, statWeights);

    if (category === 'Lift' && sets) {
        const exerciseCanonicalName = exerciseMetadata.name;
        const userBest1RM = strongestLiftsByExercise?.[exerciseCanonicalName]?.oneRm ?? 0;

        sets.forEach(set => {
            const { weight, reps } = set;
            if (weight === undefined || reps === undefined) return;

            const currentLift1RM = calculateOneRm(weight, reps);
            const effortFactor = userBest1RM > 0 ? Math.min(1.0, currentLift1RM / userBest1RM) : 1.0;
            const baseXP = 5; // Per set
            const xpForSet = baseXP * difficultyMultiplier * effortFactor;

            for (const statName in statWeighting) {
                awardedXp[statName] += xpForSet * statWeighting[statName];
            }
        });
    } else if (category === 'Stretch' && sets) {
        sets.forEach(set => {
            if (set.duration === undefined) return;
            // XP = 10 * (duration in seconds / 30) * difficultyMultiplier * statWeight
            const xpForSet = 10 * (set.duration / 30) * difficultyMultiplier;
            for (const statName in statWeighting) {
                awardedXp[statName] += xpForSet * statWeighting[statName];
            }
        });
    } else if (category === 'Cardio' && duration) {
        const mets = exerciseMetadata.mets || 7; // Use 7 if not defined
        // XP = 25 * (duration in minutes / 60) * (METs / 10) * difficultyMultiplier * statWeight
        const xpForCardio = 25 * (duration / 60) * (mets / 10) * difficultyMultiplier;
        for (const statName in statWeighting) {
            awardedXp[statName] += xpForCardio * statWeighting[statName];
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
        const weights = statWeights[category]?.[key.toLowerCase()];
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
    if (exerciseMetadata.force) applyWeight('force', exerciseMetadata.force);
    if (exerciseMetadata.mechanic) applyWeight('mechanic', exerciseMetadata.mechanic);
    if (exerciseMetadata.equipment) applyWeight('equipment', exerciseMetadata.equipment);

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
    const exercisesPath = path.join(__dirname, '../data/exercises.json');
    try {
        const data = await fs.readFile(exercisesPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading exercises.json:', error);
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
