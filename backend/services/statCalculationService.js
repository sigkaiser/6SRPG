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
    cardioEndurance: 1000, // Assuming this is a target raw score like others
    flexibilityMobility: 800,  // Assuming this is a target raw score like others
    // Vitality removed
};

// For mapping keys from stat_weights.json (PascalCase) to internal keys (camelCase)
const STAT_KEY_MAP_PASCAL_TO_CAMEL = {
    "UpperBodyStrength": "upperBodyStrength",
    "LowerBodyStrength": "lowerBodyStrength",
    "CoreStrength": "coreStrength",
    "PowerExplosiveness": "powerExplosiveness",
    "CardioEndurance": "cardioEndurance",
    "FlexibilityMobility": "flexibilityMobility",
    "Vitality": "vitality" // Include even if not "tracked" for comprehensive mapping from source file
};

// For mapping internal camelCase keys to PascalCase for stat_weights.json lookups
const STAT_KEY_MAP_CAMEL_TO_PASCAL = Object.fromEntries(
    Object.entries(STAT_KEY_MAP_PASCAL_TO_CAMEL).map(([pascal, camel]) => [camel, pascal])
);

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

    const pascalCaseStatName = STAT_KEY_MAP_CAMEL_TO_PASCAL[camelCaseStatName];
    if (!pascalCaseStatName) {
        // This camelCaseStatName isn't in our defined mappings, so it can't be relevant
        // or there's an issue with TRACKED_STATS vs STAT_KEY_MAP_CAMEL_TO_PASCAL definitions
        console.warn(`isExerciseRelevantForStat: Could not find pascalCase mapping for ${camelCaseStatName}`);
        return false;
    }

    // Check primary muscles
    for (const muscle of exerciseInfo.primaryMuscles || []) {
        if (statWeights.muscles?.[muscle]?.[pascalCaseStatName]) return true;
    }
    // Check secondary muscles
    for (const muscle of exerciseInfo.secondaryMuscles || []) {
        if (statWeights.muscles?.[muscle]?.[pascalCaseStatName]) return true;
    }
    // Check force
    if (exerciseInfo.force && statWeights.force?.[exerciseInfo.force.toLowerCase()]?.[pascalCaseStatName]) return true;
    // Check mechanic
    if (exerciseInfo.mechanic && statWeights.mechanic?.[exerciseInfo.mechanic.toLowerCase()]?.[pascalCaseStatName]) return true;
    // Check equipment
    if (exerciseInfo.equipment && statWeights.equipment?.[exerciseInfo.equipment.toLowerCase()]?.[pascalCaseStatName]) return true;
    // Check difficulty (level) - as per existing logic for potential stat calculation
    if (exerciseInfo.level && statWeights.difficulty?.[exerciseInfo.level.toLowerCase()]?.[pascalCaseStatName]) return true;

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
                for (const [pascalCaseStat, weight] of Object.entries(statWeights.muscles[muscle])) {
                    const camelCaseStatKey = STAT_KEY_MAP_PASCAL_TO_CAMEL[pascalCaseStat];
                    if (camelCaseStatKey && TRACKED_STATS.includes(camelCaseStatKey)) {
                        liftStatContributions[camelCaseStatKey] = (liftStatContributions[camelCaseStatKey] || 0) + weight;
                    }
                }
            }
        }

        // Secondary Muscles (50% weight)
        for (const muscle of lift.secondaryMuscles || []) {
            if (statWeights.muscles?.[muscle]) {
                for (const [pascalCaseStat, weight] of Object.entries(statWeights.muscles[muscle])) {
                    const camelCaseStatKey = STAT_KEY_MAP_PASCAL_TO_CAMEL[pascalCaseStat];
                    if (camelCaseStatKey && TRACKED_STATS.includes(camelCaseStatKey)) {
                        liftStatContributions[camelCaseStatKey] = (liftStatributions[camelCaseStatKey] || 0) + (weight * 0.5);
                    }
                }
            }
        }

        // Difficulty (Level) - contributes to potential stat calculation
        if (lift.level && statWeights.difficulty?.[lift.level.toLowerCase()]) {
            for (const [pascalCaseStat, weight] of Object.entries(statWeights.difficulty[lift.level.toLowerCase()])) {
                const camelCaseStatKey = STAT_KEY_MAP_PASCAL_TO_CAMEL[pascalCaseStat];
                if (camelCaseStatKey && TRACKED_STATS.includes(camelCaseStatKey)) {
                    liftStatContributions[camelCaseStatKey] = (liftStatContributions[camelCaseStatKey] || 0) + weight;
                }
            }
        }

        // Other categories: Force, Mechanic, Equipment
        const otherMetadataCategories = ['force', 'mechanic', 'equipment'];
        for (const categoryKey of otherMetadataCategories) { // e.g. categoryKey is 'force'
            const liftPropertyValue = lift[categoryKey]; // e.g. lift.force value like 'push'
            if (liftPropertyValue && statWeights[categoryKey]?.[liftPropertyValue.toLowerCase()]) {
                for (const [pascalCaseStat, weight] of Object.entries(statWeights[categoryKey][liftPropertyValue.toLowerCase()])) {
                    const camelCaseStatKey = STAT_KEY_MAP_PASCAL_TO_CAMEL[pascalCaseStat];
                    if (camelCaseStatKey && TRACKED_STATS.includes(camelCaseStatKey)) {
                        liftStatContributions[camelCaseStatKey] = (liftStatContributions[camelCaseStatKey] || 0) + weight;
                    }
                }
            }
        }

        for (const [statName, contributionWeight] of Object.entries(liftStatContributions)) {
            if (rawStats.hasOwnProperty(statName)) {
                const points = lift.oneRm * contributionWeight;
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
    const awardedXp = TRACKED_STATS.reduce((acc, stat) => {
        acc[stat] = 0;
        return acc;
    }, {});

    if (!loggedExercise || !exerciseMetadata || !statWeights) {
        console.error("Missing required data for XP calculation.");
        return awardedXp;
    }

    const baseXP = (loggedExercise.sets || 0) * 5;
    if (baseXP === 0) return awardedXp;

    let difficultyMultiplier = 1.0; // Default for beginner or if level undefined
    if (exerciseMetadata.level) {
        const levelLower = exerciseMetadata.level.toLowerCase();
        if (levelLower === 'intermediate') difficultyMultiplier = 1.25;
        else if (levelLower === 'expert' || levelLower === 'advanced') difficultyMultiplier = 1.5; // Assuming expert means advanced
    }

    let effortFactor = 0;
    const exerciseCanonicalName = exerciseMetadata.name; // Use canonical name from DB
    const userBest1RMForExercise = strongestLiftsByExercise?.[exerciseCanonicalName]?.oneRm;

    let currentLift1RM = calculateOneRm(loggedExercise.weight, loggedExercise.reps);

    if (userBest1RMForExercise && userBest1RMForExercise > 0) {
        // Use the greater of the current lift's 1RM and the user's known best 1RM for this exercise type
        // This ensures that if they lift less than their 1RM, the effort is scaled against their max potential.
        // If they set a new PR, the effort is against that new PR (effectively 1.0 effort for the PR itself).
        effortFactor = Math.min(1.0, currentLift1RM / userBest1RMForExercise);
    } else if (currentLift1RM > 0) {
        // First time doing this exercise, or no historical 1RM, effort is against current lift's 1RM.
        effortFactor = 1.0; // Max effort for a new PR or first attempt
    }

    if (loggedExercise.weight === 0 && currentLift1RM === 0) { // For bodyweight exercises with no direct 1RM equivalent
        effortFactor = 0.5; // Default effort factor for bodyweight non-rep-maxed exercises, can be adjusted
    }


    const coreXpValue = baseXP * difficultyMultiplier * effortFactor;
    if (coreXpValue === 0) return awardedXp;

    for (const statName of TRACKED_STATS) {
        let totalStatXp = 0;
        let contributingWeight = 0;

        // Primary Muscles
        for (const muscle of exerciseMetadata.primaryMuscles || []) {
            contributingWeight = statWeights.muscles?.[muscle]?.[statName] || 0;
            totalStatXp += coreXpValue * contributingWeight;
        }
        // Secondary Muscles (0.5x weight)
        for (const muscle of exerciseMetadata.secondaryMuscles || []) {
            contributingWeight = statWeights.muscles?.[muscle]?.[statName] || 0;
            totalStatXp += coreXpValue * (contributingWeight * 0.5);
        }
        // Force
        if (exerciseMetadata.force) {
            contributingWeight = statWeights.force?.[exerciseMetadata.force.toLowerCase()]?.[statName] || 0;
            totalStatXp += coreXpValue * contributingWeight;
        }
        // Mechanic
        if (exerciseMetadata.mechanic) {
            contributingWeight = statWeights.mechanic?.[exerciseMetadata.mechanic.toLowerCase()]?.[statName] || 0;
            totalStatXp += coreXpValue * contributingWeight;
        }
        // Equipment
        if (exerciseMetadata.equipment) {
            contributingWeight = statWeights.equipment?.[exerciseMetadata.equipment.toLowerCase()]?.[statName] || 0;
            totalStatXp += coreXpValue * contributingWeight;
        }
        // IMPORTANT: Difficulty from stat_weights.json is NOT used here, as per plan.

        if (totalStatXp > 0) {
            awardedXp[statName] = Math.round(totalStatXp * 100) / 100; // Round to 2 decimal places
        }
    }
    return awardedXp;
}

// Apply awarded XP to user's stats and handle leveling up
function applyXpAndLevelUp(currentUserStats, awardedXpMap) {
    const updatedStats = JSON.parse(JSON.stringify(currentUserStats)); // Deep copy

    for (const statName of TRACKED_STATS) {
        const xpGained = awardedXpMap[statName] || 0;
        if (xpGained === 0) continue;

        const stat = updatedStats[statName];
        // Stat must have a potential value to gain XP and level up
        if (stat.potential === null || stat.current === null) {
            console.log(`Stat ${statName} has no potential or current value, XP not applied.`);
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


// Helper function to fetch the exercise DB data (similar to frontend)
// This could be in a more generic helper/utils file if used elsewhere in backend
async function fetchExerciseDb() {
    // In a production app, this URL might be a config value,
    // and the data might be cached or periodically updated in our own DB/storage.
    const EXERCISE_DB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
    try {
        const response = await fetch(EXERCISE_DB_URL);
        if (!response.ok) {
            throw new Error(`HTTP error fetching exercise DB! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Exercise DB:', error);
        // Depending on how critical this is, you might want to throw or return null/empty array
        // and let the caller handle it. For stat calculation, it's critical.
        throw new Error('Could not fetch exercise database.');
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
    applyXpAndLevelUp
};
