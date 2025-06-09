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

module.exports = router;
