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

// POST /api/users/:id/exercises
router.post('/:id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { type, sets, reps, weight, date } = req.body;

    // Validate required fields
    if (!type || sets === undefined || reps === undefined || weight === undefined) {
      return res.status(400).json({ error: 'Missing required exercise fields: type, sets, reps, weight' });
    }

    const newExercise = {
      type, // This corresponds to exerciseName from the frontend
      sets,
      reps,
      weight,
      date: date ? new Date(date) : Date.now(),
    };

    user.exerciseHistory.push(newExercise);
    await user.save();

    // Return the newly added exercise
    // The exercise is the last one in the array after push
    res.status(200).json(user.exerciseHistory[user.exerciseHistory.length - 1]);
  } catch (err) {
    console.error('Error adding exercise:', err);
    res.status(500).json({ error: 'Failed to add exercise' });
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
const { calculateUserStats, fetchExerciseDb } = require('../services/statCalculationService');

// POST /api/users/:userId/recalculate-stats - Recalculate and update user stats
router.post('/:userId/recalculate-stats', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch the Free Exercise DB data
        const exerciseDbData = await fetchExerciseDb();
        if (!exerciseDbData || exerciseDbData.length === 0) {
            // This indicates a problem fetching or with the DB content itself.
            return res.status(503).json({ message: 'Exercise database is currently unavailable or empty.' });
        }

        const calculatedResults = await calculateUserStats(user.exerciseHistory, exerciseDbData);

        // Separate the stats from detailedContributions
        const { detailedContributions, ...newStatsFromCalc } = calculatedResults;

        // Update user's stats
        // Ensure user.stats exists, initialize if it's somehow missing
        if (!user.stats) {
            user.stats = {};
        }

        // Update only the stats that are actually calculated and present in newStatsFromCalc
        // This avoids accidentally wiping other potential stat fields if they exist.
        for (const statKey in newStatsFromCalc) {
            if (newStatsFromCalc.hasOwnProperty(statKey)) {
                user.stats[statKey] = newStatsFromCalc[statKey];
            }
        }

        // Mark 'stats' as modified because it's a mixed type schema.
        // This tells Mongoose that the sub-document has changed.
        user.markModified('stats');

        await user.save();

        // Prepare response: user data + detailed contributions
        const userResponse = user.toJSON(); // Uses transform from UserSchema
        userResponse.detailedContributions = detailedContributions;

        res.json({ message: 'Stats recalculated successfully.', user: userResponse });

    } catch (error) {
        console.error(`Error recalculating stats for user ${userId}:`, error);
        if (error.message.includes('Could not fetch exercise database') || error.message.includes('Exercise database is currently unavailable')) {
            res.status(503).json({ message: `Service dependency failure: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An error occurred while recalculating stats.' });
        }
    }
});

module.exports = router;
