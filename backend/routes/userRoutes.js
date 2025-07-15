const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

// POST /api/users/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({ username, email, passwordHash });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    res.status(200).json({ message: 'Login successful', user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user data' });
  }
});

// --- Stat Calculation Service and User Model ---
// Ensure User model is already required at the top if not (it is in this file)
const statCalculationService = require('../services/statCalculationService');
const { TRACKED_STATS } = require('../services/statCalculationService'); // Import TRACKED_STATS if not already available through the service object

// POST /api/users/:id/exercises - (Updated to include stat and XP processing)
router.post('/:id/exercises', async (req, res) => {
  console.log(`[XP LOG] Received request to log exercise for user ID: ${req.params.id}`);
  console.log(`[XP LOG] Request body:`, req.body);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      console.error(`[XP LOG] User not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const { type, category, sets, duration, date } = req.body;

    if (!type || !category) {
      return res.status(400).json({ error: 'Missing required fields: type, category' });
    }

    const loggedExercise = {
      type,
      category,
      date: date ? new Date(date) : new Date(),
    };

    if (category === 'Lift' || category === 'Stretch') {
      if (!Array.isArray(sets) || sets.length === 0) {
        return res.status(400).json({ error: 'Sets are required for Lift and Stretch exercises.' });
      }
      loggedExercise.sets = sets;
    } else if (category === 'Cardio') {
      if (duration === undefined) {
        return res.status(400).json({ error: 'Duration is required for Cardio exercises.' });
      }
      loggedExercise.duration = duration;
      // In the future, METs will be added to exercises.json and used here
      loggedExercise.intensity = 7; // Placeholder
    } else {
      return res.status(400).json({ error: 'Invalid exercise category.' });
    }

    user.exerciseHistory.push(loggedExercise);
    // Don't save yet, will save after stat updates

    // --- Begin Stat and XP Processing ---
    console.log('[XP LOG] Starting stat and XP processing.');
    const exerciseDbData = await statCalculationService.fetchExerciseDb();
    if (!exerciseDbData || exerciseDbData.length === 0) {
        console.error('[XP LOG] Exercise database is unavailable or empty.');
        return res.status(503).json({ error: 'Exercise database is currently unavailable or empty. Exercise logged but stats not updated.' });
    }

    const statWeights = await statCalculationService.loadStatWeights();
    if (!statWeights) {
        console.error('[XP LOG] Stat weights configuration is unavailable.');
        return res.status(503).json({ error: 'Stat weights configuration is currently unavailable. Exercise logged but stats not updated.' });
    }

    // 1. Calculate Potential Stats (and get strongest lifts)
    console.log('[XP LOG] Calculating potential stats.');
    const potentialResults = await statCalculationService.calculatePotentialStats(user.exerciseHistory, exerciseDbData, statWeights);
    const { strongestLiftsByExercise, detailedContributions, ...newPotentials } = potentialResults;
    console.log('[XP LOG] Potential stats calculated:', newPotentials);

    // Initialize user.stats if it's not already there (should be by schema defaults, but good practice)
    if (!user.stats) {
        console.log('[XP LOG] Initializing user.stats object.');
        user.stats = {}; // This should align with new schema structure
    }
    TRACKED_STATS.forEach(statName => {
        if (!user.stats[statName]) {
            user.stats[statName] = { current: null, potential: null, xp: 0, xpToNext: 0};
        }
    });


    // 2. Update user's potential stats and initialize current/xp if new
    for (const statName of TRACKED_STATS) { // Iterate using TRACKED_STATS from service
        const calculatedPotential = newPotentials[statName];
        const userStat = user.stats[statName];

        if (calculatedPotential !== null) { // Potential is calculable (>= 5 exercises)
            if (userStat.potential === null) { // First time this stat's potential is calculated
                userStat.potential = calculatedPotential;
                userStat.current = Math.max(1, Math.round(0.10 * userStat.potential)); // Ensure current is at least 1
                userStat.xp = 0;
                userStat.xpToNext = statCalculationService.getXpToNext(userStat.current);
            } else {
                userStat.potential = calculatedPotential; // Update if it changed (e.g. new 1RM)
            }
        } else { // Potential is not calculable (< 5 exercises)
            userStat.potential = null;
            userStat.current = null;
            userStat.xp = 0;
            userStat.xpToNext = 0; // Or some indicator like Infinity if preferred
        }
    }

    // 3. Calculate XP for the logged exercise
    console.log('[XP LOG] Calculating XP for the logged exercise.');
    const exerciseMetadata = exerciseDbData.find(ex => ex.name.toLowerCase() === loggedExercise.type.toLowerCase());
    let awardedXpMap = {};
    if (exerciseMetadata) {
        awardedXpMap = statCalculationService.calculateXpForExercise(loggedExercise, exerciseMetadata, statWeights, strongestLiftsByExercise);
        console.log('[XP LOG] XP calculated:', awardedXpMap);
    } else {
        console.warn(`[XP LOG] Metadata for exercise type "${loggedExercise.type}" not found. XP cannot be calculated for this exercise.`);
        // awardedXpMap will remain all zeros
    }

    // 4. Apply XP and Handle Level Ups
    if (Object.keys(awardedXpMap).length > 0) {
        console.log('[XP LOG] Applying XP and handling level ups.');
        user.stats = statCalculationService.applyXpAndLevelUp(user.stats, awardedXpMap);
        console.log('[XP LOG] User stats after applying XP:', user.stats);
    }

    user.markModified('stats');
    await user.save();
    // --- End Stat and XP Processing ---

    res.status(200).json(user.exerciseHistory[user.exerciseHistory.length - 1]);

  } catch (err) {
    console.error('Error adding exercise and updating stats:', err);
    // Check if headers sent, because some errors might happen after initial data fetch success
    if (!res.headersSent) {
        if (err.message.includes('Exercise database') || err.message.includes('Stat weights')) {
             res.status(503).json({ error: `Service dependency failure: ${err.message}. Exercise logged but stats might not be fully updated.` });
        } else {
             res.status(500).json({ error: 'Failed to add exercise or update stats.' });
        }
    }
  }
});


// POST /api/users/:userId/recalculate-stats - Recalculate and update user stats
// This route might need adjustments later if we want it to fully re-initialize current stats based on new potentials,
// or it could be deprecated in favor of incremental updates. For now, let's ensure it uses the new structures.
router.post('/:userId/recalculate-stats', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const exerciseDbData = await statCalculationService.fetchExerciseDb();
        if (!exerciseDbData || exerciseDbData.length === 0) {
            return res.status(503).json({ message: 'Exercise database is currently unavailable or empty.' });
        }
        const statWeights = await statCalculationService.loadStatWeights();
         if (!statWeights) {
            return res.status(503).json({ error: 'Stat weights configuration is currently unavailable.' });
        }

        // Recalculate Potentials
        const potentialResults = await statCalculationService.calculatePotentialStats(user.exerciseHistory, exerciseDbData, statWeights);
        const { detailedContributions, ...newPotentials } = potentialResults; // strongestLiftsByExercise not directly used here unless we reset XP

        if (!user.stats) user.stats = {}; // Should be initialized by schema

        for (const statName of TRACKED_STATS) {
            const calculatedPotential = newPotentials[statName];
            const userStat = user.stats[statName] || { current: null, potential: null, xp: 0, xpToNext: 0 }; // Ensure stat object exists

            if (calculatedPotential !== null) {
                // If potential changes, current model is that 'current' stat and 'xp' are NOT reset.
                // They continue from where they are, towards the new potential.
                // If a full reset of 'current' to 10% of new potential is desired, that logic would go here.
                userStat.potential = calculatedPotential;

                // If current was null (e.g. stat just became active), initialize it.
                if (userStat.current === null) {
                    userStat.current = Math.max(1, Math.round(0.10 * userStat.potential));
                    userStat.xp = 0;
                    userStat.xpToNext = statCalculationService.getXpToNext(userStat.current);
                }
            } else { // Potential is now null (e.g. data changed, <5 exercises)
                userStat.potential = null;
                userStat.current = null;
                userStat.xp = 0;
                userStat.xpToNext = 0;
            }
            user.stats[statName] = userStat;
        }

        // Note: This recalculate route does NOT award new XP or re-evaluate XP based on history.
        // It primarily recalculates and updates potentials, and initializes current stats if they were null.

        user.markModified('stats');
        await user.save();

        const userResponse = user.toJSON();
        userResponse.detailedContributions = detailedContributions; // Add contributions from potential calculation

        res.json({ message: 'Stats recalculated successfully.', user: userResponse });

    } catch (error) {
        console.error(`Error recalculating stats for user ${userId}:`, error);
        if (!res.headersSent) {
            if (error.message.includes('Could not fetch exercise database') || error.message.includes('Exercise database is currently unavailable') || error.message.includes('Stat weights')) {
                res.status(503).json({ message: `Service dependency failure: ${error.message}` });
            } else {
                res.status(500).json({ message: 'An error occurred while recalculating stats.' });
            }
        }
    }
});

module.exports = router;
