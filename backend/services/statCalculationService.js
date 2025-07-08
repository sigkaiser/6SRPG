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
    cardioEndurance: 1000, // This is now the target for raw points from cardio calculations
    flexibilityMobility: 800,
};

// Cardio Benchmarks & Settings
const RUNNING_BENCHMARK_SPEED_KMH = 20; // Elite speed for 1000 raw points
const CYCLING_BENCHMARK_SPEED_KMH = 40; // Elite speed for 1000 raw points
const MIN_RUNNING_DURATION_MIN = 5;
const MIN_RUNNING_DISTANCE_KM = 1.6; // ~1 mile
const MIN_CYCLING_DURATION_MIN = 10;
const MIN_CYCLING_DISTANCE_KM = 8; // ~5 miles

// Exercise Categories
const STRENGTH_POWER_CATEGORIES = ["strength", "powerlifting", "olympic weightlifting", "strongman", "bodybuilding", "calisthenics"];
const CARDIO_ENDURANCE_CATEGORIES = ["cardio", "running", "cycling", "swimming", "rowing"];


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

// Main function to calculate stats
async function calculateUserStats(userExerciseHistory, exerciseDbData) {
    if (!userExerciseHistory || userExerciseHistory.length === 0) {
        // Return base stats (which become ~77 after sigmoid)
        const baseVal = sigmoidScaled(1);
        return {
            upperBodyStrength: baseVal, lowerBodyStrength: baseVal, coreStrength: baseVal,
            powerExplosiveness: baseVal, cardioEndurance: baseVal, flexibilityMobility: baseVal,
            detailedContributions: {}
        };
    }

    const statWeights = await loadStatWeights();
    const exerciseMetadataMap = new Map();
    exerciseDbData.forEach(ex => exerciseMetadataMap.set(ex.name.toLowerCase(), ex));

    const strengthPowerLogs = [];
    const cardioLogs = [];
    const otherLogs = []; // For exercises that might contribute to flexibility via equipment, etc.

    // Separate logs by primary calculation type
    for (const loggedEx of userExerciseHistory) {
        if (!loggedEx.type || !exerciseMetadataMap.has(loggedEx.type.toLowerCase())) {
            // console.warn(`Skipping log: type missing or not in DB - ${loggedEx.type}`);
            continue;
        }
        const exerciseInfo = exerciseMetadataMap.get(loggedEx.type.toLowerCase());
        const category = exerciseInfo.category ? exerciseInfo.category.toLowerCase() : null;

        if (category && STRENGTH_POWER_CATEGORIES.includes(category)) {
            // Validate data needed for strength/power
            if (typeof loggedEx.weight === 'number' && typeof loggedEx.reps === 'number') {
                strengthPowerLogs.push(loggedEx);
            } else {
                // console.warn(`Skipping strength/power log due to missing weight/reps: ${JSON.stringify(loggedEx)}`);
            }
        } else if (category && CARDIO_ENDURANCE_CATEGORIES.includes(category)) {
             // Validate data needed for cardio (distanceKm, durationMin will be checked in the helper)
            cardioLogs.push(loggedEx);
        } else {
            // These might still contribute to flexibility if they use specific equipment like "foam roll"
            // and are processed by the "strength" path's logic for equipment.
            // Or if they are generic exercises with some primary/secondary muscle weights.
            // For now, we'll add them to a list that can be processed similarly to strength logs
            // but without necessarily requiring 1RM (e.g. if weight/reps are 0 or not applicable).
            // This primarily allows Flexibility contributions from non-strength, non-cardio items.
            if (typeof loggedEx.weight !== 'number' || typeof loggedEx.reps !== 'number') {
                // If weight/reps aren't numbers, set to 0 to allow processing for other attributes
                // like equipment (e.g. foam roll) without breaking 1RM calc.
                otherLogs.push({...loggedEx, weight: loggedEx.weight || 0, reps: loggedEx.reps || 0});
            } else {
                otherLogs.push(loggedEx);
            }
        }
    }

    // Initialize rawStats and detailedContributions
    const rawStats = {
        upperBodyStrength: 0, lowerBodyStrength: 0, coreStrength: 0,
        powerExplosiveness: 0, cardioEndurance: 0, flexibilityMobility: 0,
    };
    const detailedContributions = {};

    // 1. Process Strength/Power Logs (1RM-based)
    const strongestLifts = {};
    for (const loggedEx of strengthPowerLogs) {
        const oneRm = calculateOneRm(loggedEx.weight, loggedEx.reps);
        const exerciseNameLower = loggedEx.type.toLowerCase();
        const exerciseInfo = exerciseMetadataMap.get(exerciseNameLower); // Already checked it exists

        if (!strongestLifts[exerciseInfo.name] || oneRm > strongestLifts[exerciseInfo.name].oneRm) {
            strongestLifts[exerciseInfo.name] = {
                name: exerciseInfo.name,
                oneRm: oneRm,
                primaryMuscles: exerciseInfo.primaryMuscles || [],
                secondaryMuscles: exerciseInfo.secondaryMuscles || [],
                force: exerciseInfo.force,
                mechanic: exerciseInfo.mechanic,
                level: exerciseInfo.level,
                equipment: exerciseInfo.equipment,
            };
        }
    }
    const processedStrongestLifts = Object.values(strongestLifts);

    // Process "other" logs - these are not for primary strength 1RM, but may contribute via equipment/muscles
    // e.g., a "Foam Rolling" exercise (category: 'flexibility', equipment: 'foam roll')
    // We treat its "1RM" as 1 if not applicable, so its weights apply directly.
    // This is a simplified way to include non-strength, non-cardio specific exercises.
    const processedOtherLifts = [];
    for (const loggedEx of otherLogs) {
        const exerciseNameLower = loggedEx.type.toLowerCase();
        const exerciseInfo = exerciseMetadataMap.get(exerciseNameLower);
         if (exerciseInfo) { // Should always be true based on earlier filter
            processedOtherLifts.push({
                name: exerciseInfo.name,
                oneRm: (loggedEx.weight > 0 && loggedEx.reps > 0) ? calculateOneRm(loggedEx.weight, loggedEx.reps) : 1, // Use 1RM if available, else 1 to apply weights
                primaryMuscles: exerciseInfo.primaryMuscles || [],
                secondaryMuscles: exerciseInfo.secondaryMuscles || [],
                force: exerciseInfo.force,
                mechanic: exerciseInfo.mechanic,
                level: exerciseInfo.level,
                equipment: exerciseInfo.equipment,
            });
        }
    }

    // Combine strongest strength lifts and other relevant exercises for weight calculation
    const allWeightedLifts = [...processedStrongestLifts, ...processedOtherLifts];


    if (allWeightedLifts.length === 0 && cardioLogs.length === 0) {
        console.log('No relevant exercises found after filtering for strength, power, cardio, or other contributors.');
        const baseVal = sigmoidScaled(1); // All stats to base if no data
        return {
            upperBodyStrength: baseVal, lowerBodyStrength: baseVal, coreStrength: baseVal,
            powerExplosiveness: baseVal, cardioEndurance: baseVal, flexibilityMobility: baseVal,
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
        "FlexibilityMobility": "flexibilityMobility"
        // Vitality removed as it's no longer a calculated stat
    };
    const getStatKeyConsistent = (statName) => statKeyMap[statName] || statName;

    // Initialize rawStats and detailedContributions
    const rawStats = {
        upperBodyStrength: 0, lowerBodyStrength: 0, coreStrength: 0,
        powerExplosiveness: 0, cardioEndurance: 0, flexibilityMobility: 0,
        // vitality: 0 // if we decide to include it
    };
    const detailedContributions = {};

    // 2. Calculate contributions from Strength/Power lifts and Other lifts
    // This loop processes all lifts that contribute based on 1RM (or effective 1RM of 1 for 'other') and their attributes
    for (const lift of allWeightedLifts) { // Changed from processedStrongestLifts to allWeightedLifts
        const liftStatContributions = {};

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


// Helper function to calculate raw cardio endurance points
function _calculate_raw_cardio_endurance(cardioLogs, exerciseMetadataMap, statWeights) {
    let bestRunningPerformance = { speed: 0, rawPoints: 0, details: null };
    let bestCyclingPerformance = { speed: 0, rawPoints: 0, details: null };

    for (const loggedEx of cardioLogs) {
        // Ensure loggedEx has type, and that type can be found in exerciseMetadataMap
        if (!loggedEx.type || !exerciseMetadataMap.has(loggedEx.type.toLowerCase())) {
            // console.warn(`Skipping cardio log due to missing type or type not in DB: ${JSON.stringify(loggedEx)}`);
            continue;
        }
        const exerciseInfo = exerciseMetadataMap.get(loggedEx.type.toLowerCase());
        const category = exerciseInfo.category ? exerciseInfo.category.toLowerCase() : null;

        // Ensure distance and duration are numbers and positive
        const distanceKm = typeof loggedEx.distanceKm === 'number' && loggedEx.distanceKm > 0 ? loggedEx.distanceKm : 0;
        const durationMin = typeof loggedEx.durationMin === 'number' && loggedEx.durationMin > 0 ? loggedEx.durationMin : 0;

        if (distanceKm === 0 || durationMin === 0) {
            // console.warn(`Skipping cardio log due to invalid distance or duration: ${JSON.stringify(loggedEx)}`);
            continue;
        }

        const currentSpeedKmh = distanceKm / (durationMin / 60);

        if (category === 'running') {
            if (durationMin >= MIN_RUNNING_DURATION_MIN || distanceKm >= MIN_RUNNING_DISTANCE_KM) {
                if (currentSpeedKmh > bestRunningPerformance.speed) {
                    const rawPoints = Math.min(STAT_CAP_RAW_MAX, (currentSpeedKmh / RUNNING_BENCHMARK_SPEED_KMH) * STAT_CAP_RAW_MAX);
                    bestRunningPerformance = {
                        speed: currentSpeedKmh,
                        rawPoints: rawPoints,
                        details: {
                            exerciseName: `${exerciseInfo.name} (Best Sustained Pace)`,
                            value: `${currentSpeedKmh.toFixed(2)} km/h (${distanceKm}km in ${durationMin}min)`,
                            pointsContribution: parseFloat(rawPoints.toFixed(2))
                        }
                    };
                }
            }
        } else if (category === 'cycling') {
            if (durationMin >= MIN_CYCLING_DURATION_MIN || distanceKm >= MIN_CYCLING_DISTANCE_KM) {
                if (currentSpeedKmh > bestCyclingPerformance.speed) {
                    const rawPoints = Math.min(STAT_CAP_RAW_MAX, (currentSpeedKmh / CYCLING_BENCHMARK_SPEED_KMH) * STAT_CAP_RAW_MAX);
                    bestCyclingPerformance = {
                        speed: currentSpeedKmh,
                        rawPoints: rawPoints,
                        details: {
                            exerciseName: `${exerciseInfo.name} (Best Sustained Pace)`,
                            value: `${currentSpeedKmh.toFixed(2)} km/h (${distanceKm}km in ${durationMin}min)`,
                            pointsContribution: parseFloat(rawPoints.toFixed(2))
                        }
                    };
                }
            }
        }
        // TODO: Could add cases for swimming, rowing if benchmarks defined
    }

    if (bestRunningPerformance.rawPoints >= bestCyclingPerformance.rawPoints && bestRunningPerformance.rawPoints > 0) {
        return { rawCardioEndurance: bestRunningPerformance.rawPoints, details: bestRunningPerformance.details };
    } else if (bestCyclingPerformance.rawPoints > 0) {
        return { rawCardioEndurance: bestCyclingPerformance.rawPoints, details: bestCyclingPerformance.details };
    }

    return { rawCardioEndurance: 0, details: null }; // Default if no qualifying cardio
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
    calculateUserStats,
    sigmoidScaled,
    calculateOneRm,
    loadStatWeights, // if needed by routes directly, though likely not
    fetchExerciseDb // Exporting this for the route to use
};
