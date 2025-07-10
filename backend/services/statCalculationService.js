// backend/services/statCalculationService.js
const fs = require('node:fs/promises');
const path = require('node:path');

const EPLEY_CONSTANT = 30;
const STAT_CAP_RAW_MAX = 1000; // Max value after initial normalization, before sigmoid

const EXPECTED_STAT_CAPS = {
    // These are the raw score caps before normalization to 1000
    // Based on user prompt
    upperBodyStrength: 2000,
    lowerBodyStrength: 3000,
    coreStrength: 1500,
    powerExplosiveness: 1800,
    cardioEndurance: 1000, // This might need adjustment based on how it's calculated if not 1RM based
    flexibilityMobility: 800,  // Same as above
    // Vitality is in stat_weights but not in User.js, so omitting for now
};

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

// Main function to calculate stats (initial structure)
async function calculateUserStats(userExerciseHistory, exerciseDbData) {
    if (!userExerciseHistory || userExerciseHistory.length === 0) {
        console.log('No exercise history provided, returning base stats or zeros.');
        // Return default or zero stats if no history
        return {
            upperBodyStrength: 1, lowerBodyStrength: 1, coreStrength: 1,
            powerExplosiveness: 1, cardioEndurance: 1, flexibilityMobility: 1,
            detailedContributions: {}
        };
    }

    const statWeights = await loadStatWeights();

    // Create a map for quick lookup of exercise metadata
    const exerciseMetadataMap = new Map();
    for (const ex of exerciseDbData) {
        exerciseMetadataMap.set(ex.name.toLowerCase(), ex);
    }

    // 1. Identify Strongest Lifts for each exercise type
    const strongestLifts = {}; // Store strongest lift for each exercise type (name)

    for (const loggedEx of userExerciseHistory) {
        if (!loggedEx.type || typeof loggedEx.weight !== 'number' || typeof loggedEx.reps !== 'number') {
            // console.warn(`Skipping logged exercise due to missing type, weight, or reps: ${JSON.stringify(loggedEx)}`);
            continue;
        }

        const oneRm = calculateOneRm(loggedEx.weight, loggedEx.reps);
        const exerciseNameLower = loggedEx.type.toLowerCase();
        const exerciseInfo = exerciseMetadataMap.get(exerciseNameLower);

        if (!exerciseInfo) {
            // console.warn(`Exercise "${loggedEx.type}" not found in Exercise DB. Skipping.`);
            continue;
        }

        // Filter by category - only include exercises suitable for 1RM calculation
        const RMCategories = ["strength", "powerlifting", "olympic weightlifting", "strongman"];
        if (!exerciseInfo.category || !RMCategories.includes(exerciseInfo.category.toLowerCase())) {
            // console.log(`Skipping ${loggedEx.type} as its category '${exerciseInfo.category}' is not 1RM relevant.`);
            continue;
        }

        if (!strongestLifts[exerciseInfo.name] || oneRm > strongestLifts[exerciseInfo.name].oneRm) {
            strongestLifts[exerciseInfo.name] = {
                name: exerciseInfo.name, // Use the canonical name from DB
                oneRm: oneRm,
                primaryMuscles: exerciseInfo.primaryMuscles || [],
                secondaryMuscles: exerciseInfo.secondaryMuscles || [],
                force: exerciseInfo.force,
                mechanic: exerciseInfo.mechanic,
                level: exerciseInfo.level, // This is difficulty
                equipment: exerciseInfo.equipment,
                // Store original logged exercise for reference if needed later
                // loggedExercise: loggedEx
            };
        }
    }

    const processedStrongestLifts = Object.values(strongestLifts);

    if (processedStrongestLifts.length === 0) {
        console.log('No 1RM-relevant strongest lifts found after filtering.');
         return {
            upperBodyStrength: 1, lowerBodyStrength: 1, coreStrength: 1,
            powerExplosiveness: 1, cardioEndurance: 1, flexibilityMobility: 1,
            detailedContributions: {}
        };
    }

    // Helper to ensure consistent stat key casing (camelCase)
    const statKeyMap = {
        "UpperBodyStrength": "upperBodyStrength",
        "LowerBodyStrength": "lowerBodyStrength",
        "CoreStrength": "coreStrength",
        "PowerExplosiveness": "powerExplosiveness",
        "CardioEndurance": "cardioEndurance",
        "FlexibilityMobility": "flexibilityMobility",
        "Vitality": "vitality" // Though we are currently ignoring vitality
    };
    const getStatKeyConsistent = (statName) => statKeyMap[statName] || statName;

    // Initialize rawStats and detailedContributions
    const rawStats = {
        upperBodyStrength: 0, lowerBodyStrength: 0, coreStrength: 0,
        powerExplosiveness: 0, cardioEndurance: 0, flexibilityMobility: 0,
        // vitality: 0 // if we decide to include it
    };
    const detailedContributions = {};

    // 2. Build Weighted Stat Vectors for Strongest Lifts & 3. Apply Lift Value & Aggregate Raw Stats
    for (const lift of processedStrongestLifts) {
        const liftStatContributions = {}; // Temporary vector for this lift's weights

        // Primary Muscles (100% weight)
        for (const muscle of lift.primaryMuscles) {
            if (statWeights.muscles[muscle]) {
                for (const [stat, weight] of Object.entries(statWeights.muscles[muscle])) {
                    const consistentStatKey = getStatKeyConsistent(stat);
                    if (rawStats.hasOwnProperty(consistentStatKey)) { // Only consider stats we are tracking
                        liftStatContributions[consistentStatKey] = (liftStatContributions[consistentStatKey] || 0) + weight;
                    }
                }
            }
        }

        // Secondary Muscles (50% weight)
        for (const muscle of lift.secondaryMuscles) {
            if (statWeights.muscles[muscle]) {
                for (const [stat, weight] of Object.entries(statWeights.muscles[muscle])) {
                    const consistentStatKey = getStatKeyConsistent(stat);
                     if (rawStats.hasOwnProperty(consistentStatKey)) {
                        liftStatContributions[consistentStatKey] = (liftStatContributions[consistentStatKey] || 0) + (weight * 0.5);
                    }
                }
            }
        }

        // Force, Mechanic, Difficulty (Level), Equipment
        const otherCategories = ['force', 'mechanic', 'equipment'];
        if (lift.level && statWeights.difficulty && statWeights.difficulty[lift.level.toLowerCase()]) { // level is difficulty
             for (const [stat, weight] of Object.entries(statWeights.difficulty[lift.level.toLowerCase()])) {
                const consistentStatKey = getStatKeyConsistent(stat);
                if (rawStats.hasOwnProperty(consistentStatKey)) {
                    liftStatContributions[consistentStatKey] = (liftStatContributions[consistentStatKey] || 0) + weight;
                }
            }
        }

        for (const category of otherCategories) {
            const liftProperty = lift[category];
            if (liftProperty && statWeights[category] && statWeights[category][liftProperty.toLowerCase()]) {
                for (const [stat, weight] of Object.entries(statWeights[category][liftProperty.toLowerCase()])) {
                    const consistentStatKey = getStatKeyConsistent(stat);
                    if (rawStats.hasOwnProperty(consistentStatKey)) {
                        liftStatContributions[consistentStatKey] = (liftStatContributions[consistentStatKey] || 0) + weight;
                    }
                }
            }
        }

        // Apply lift's 1RM to its stat contributions and aggregate into rawStats
        for (const [statName, contributionWeight] of Object.entries(liftStatContributions)) {
            if (rawStats.hasOwnProperty(statName)) {
                const points = lift.oneRm * contributionWeight;
                rawStats[statName] += points;

                if (!detailedContributions[statName]) {
                    detailedContributions[statName] = [];
                }
                detailedContributions[statName].push({
                    exerciseName: lift.name,
                    pointsContribution: parseFloat(points.toFixed(2)) // Store with 2 decimal places
                });
            }
        }
    }

    // 4. Normalize and Apply Sigmoid
    const finalStats = {};
    for (const statName in rawStats) {
        if (rawStats.hasOwnProperty(statName)) {
            const currentRawStat = rawStats[statName];
            const expectedCap = EXPECTED_STAT_CAPS[statName];

            let normalizedStat = 1; // Default to 1 if issues occur (e.g. cap is 0)
            if (expectedCap && expectedCap > 0 && currentRawStat > 0) {
                 // Calculate ratio, ensuring it doesn't exceed 1 (effectively capping raw stat at expected cap for this part)
                const ratio = Math.min(1, currentRawStat / expectedCap);
                normalizedStat = Math.round(ratio * STAT_CAP_RAW_MAX);
            } else if (currentRawStat <= 0) {
                normalizedStat = 1; // Minimum stat value
            }
            // Clamp between 1 and STAT_CAP_RAW_MAX (1000)
            normalizedStat = Math.min(STAT_CAP_RAW_MAX, Math.max(1, normalizedStat));

            finalStats[statName] = sigmoidScaled(normalizedStat, STAT_CAP_RAW_MAX);
        }
    }

    console.log('Final stats calculated:', finalStats);
    // console.log('Detailed contributions:', JSON.stringify(detailedContributions, null, 2));

    // 5. Prepare final output
    return {
        ...finalStats, // Spread the calculated final stats
        detailedContributions: detailedContributions
    };
}

module.exports = {
    calculateUserStats,
    sigmoidScaled, // Exporting for potential testing
    calculateOneRm, // Exporting for potential testing
    loadStatWeights, // Exporting for potential testing
    // No, don't export loadExerciseDb directly from here if it's only used by the route
};

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
    calculateUserStats,
    sigmoidScaled,
    calculateOneRm,
    loadStatWeights, // if needed by routes directly, though likely not
    fetchExerciseDb // Exporting this for the route to use
};
