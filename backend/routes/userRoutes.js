const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PlayerStats = require('../models/PlayerStats');
const ExerciseHistory = require('../models/ExerciseHistory');
const Inventory = require('../models/Inventory');
const Quest = require('../models/Quest');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to aggregate user data
async function getFullUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const [playerStats, exerciseHistory, inventory, quests] = await Promise.all([
    PlayerStats.findOne({ user: userId }).lean(),
    ExerciseHistory.findOne({ user: userId }).lean(),
    Inventory.findOne({ user: userId }).lean(),
    Quest.find({ user: userId }).lean()
  ]);

  // Aggregate Quests
  const dailyQuests = quests.filter(q => q.type === 'Daily');

  // Logic for legacy activeQuests (Main/Side quests only)
  // Ensure we don't include Daily quests here to avoid duplication
  const activeQuests = quests
    .filter(q => q.type !== 'Daily' && (q.status === 'accepted' || q.status === 'active'))
    .map(q => ({
      ...q,
      name: q.title // Map title back to name for legacy frontend compatibility
    }));

  const completedQuests = quests
    .filter(q => q.status === 'completed')
    .map(q => ({
      ...q,
      name: q.title // Map title back to name for legacy frontend compatibility
    }));

  // Merge into legacy structure
  // Explicitly preserve user._id as ...playerStats might overwrite it with its own _id
  return {
    ...user,
    ...playerStats, // level, experience, stats, levelProgress, titles, achievements
    _id: user._id,
    exerciseHistory: exerciseHistory ? exerciseHistory.history : [],
    inventory: inventory ? inventory.items : [],
    equippedItems: inventory ? inventory.equippedItems : [],
    dailyQuests,
    activeQuests,
    completedQuests
  };
}


// POST /api/users/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  let newUser = null;

  try {
    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    newUser = new User({ username, email, passwordHash });
    await newUser.save();

    // Create dependent documents
    const userId = newUser._id;

    // Create child documents sequentially. If one fails, catch block triggers cleanup.
    const playerStats = new PlayerStats({ user: userId });
    await playerStats.save();

    const exerciseHistory = new ExerciseHistory({ user: userId });
    await exerciseHistory.save();

    const inventory = new Inventory({ user: userId });
    await inventory.save();

    // Generate token
    const jwtSecret = authenticateToken.getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server authentication is misconfigured' });
    }
    const token = jwt.sign({ userId: newUser._id }, jwtSecret, { expiresIn: '1h' });

    res.status(201).json({ message: 'User registered successfully', token, user: { id: newUser._id, username: newUser.username, email: newUser.email } });
  } catch (err) {
    console.error('Registration error:', err);
    // Rollback: if user was created but subsequent steps failed, delete the user
    if (newUser && newUser._id) {
        try {
            await User.findByIdAndDelete(newUser._id);
            await PlayerStats.deleteOne({ user: newUser._id });
            await ExerciseHistory.deleteOne({ user: newUser._id });
            await Inventory.deleteOne({ user: newUser._id });
            console.log(`Rolled back partial registration for user ${newUser.email}`);
        } catch (cleanupErr) {
            console.error('Critical error during registration rollback:', cleanupErr);
        }
    }
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

    const fullUser = await getFullUser(user._id);

    // Generate token
    const jwtSecret = authenticateToken.getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server authentication is misconfigured' });
    }
    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token, user: fullUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticateToken, async (req, res) => {
  console.log(`Fetching data for user ${req.params.id}...`);
  if (req.user.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const fullUser = await getFullUser(req.params.id);
    if (!fullUser) return res.status(404).json({ error: 'User not found' });

    // Add id field for frontend compatibility if lean() removed it (lean retains _id usually)
    fullUser.id = fullUser._id;
    delete fullUser.passwordHash;
    delete fullUser._id;
    delete fullUser.__v;

    res.json(fullUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch user data' });
  }
});

const generatePersonalDailyQuests = require('../services/generatePersonalDailyQuests');

// Route to generate daily quests for a user
router.post('/:userId/daily-quests', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.userId;
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const playerStats = await PlayerStats.findOne({ user: userId });
        const exerciseHistory = await ExerciseHistory.findOne({ user: userId });

        const generatedQuests = await generatePersonalDailyQuests(user, playerStats, exerciseHistory);

        // Return full updated user object
        const updatedFullUser = await getFullUser(userId);
        updatedFullUser.id = updatedFullUser._id;
        delete updatedFullUser.passwordHash;
        delete updatedFullUser._id;

        res.status(201).json({
            success: true,
            message: 'Daily quests generated successfully.',
            generatedQuestsCount: generatedQuests.length,
            generatedQuests,
            user: updatedFullUser,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Stat Calculation Service and User Model ---
// Ensure User model is already required at the top if not (it is in this file)
const statCalculationService = require('../services/statCalculationService');
const { TRACKED_STATS } = require('../services/statCalculationService'); // Import TRACKED_STATS if not already available through the service object

// POST /api/users/:id/exercises - (Updated to include stat and XP processing)
router.post('/:id/exercises', authenticateToken, async (req, res) => {
  console.log(`[XP LOG] Received request to log exercise for user ID: ${req.params.id}`);
  console.log(`[XP LOG] Request body:`, req.body);
  const userId = req.params.id;
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[XP LOG] User not found for ID: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const exerciseHistoryDoc = await ExerciseHistory.findOne({ user: userId });
    if (!exerciseHistoryDoc) return res.status(404).json({ error: 'Exercise History not found' });

    const playerStatsDoc = await PlayerStats.findOne({ user: userId });
    if (!playerStatsDoc) return res.status(404).json({ error: 'Player Stats not found' });

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

    // Push to history
    exerciseHistoryDoc.history.push(loggedExercise);
    // await exerciseHistoryDoc.save(); // Don't save yet, wait for stats (or save now? logic said wait)

    // --- Begin Stat and XP Processing ---
    console.log('[XP LOG] Starting stat and XP processing.');
    const exerciseDbData = await statCalculationService.fetchExerciseDb();
    if (!exerciseDbData || exerciseDbData.length === 0) {
        console.error('[XP LOG] Exercise database is unavailable or empty.');
        // Save history anyway
        await exerciseHistoryDoc.save();
        return res.status(503).json({ error: 'Exercise database is currently unavailable or empty. Exercise logged but stats not updated.' });
    }

    const statWeights = await statCalculationService.loadStatWeights();
    if (!statWeights) {
        console.error('[XP LOG] Stat weights configuration is unavailable.');
        await exerciseHistoryDoc.save();
        return res.status(503).json({ error: 'Stat weights configuration is currently unavailable. Exercise logged but stats not updated.' });
    }

    // 1. Calculate Potential Stats (and get strongest lifts)
    console.log('[XP LOG] Calculating potential stats.');
    // Pass the raw history array
    const potentialResults = await statCalculationService.calculatePotentialStats(exerciseHistoryDoc.history, exerciseDbData, statWeights);
    const { strongestLiftsByExercise, detailedContributions, ...newPotentials } = potentialResults;
    console.log('[XP LOG] Potential stats calculated:', newPotentials);

    // Initialize stats if missing (shouldn't be)
    if (!playerStatsDoc.stats) {
        console.log('[XP LOG] Initializing playerStatsDoc.stats object.');
        playerStatsDoc.stats = {};
    }
    TRACKED_STATS.forEach(statName => {
        if (!playerStatsDoc.stats[statName]) {
            playerStatsDoc.stats[statName] = { current: null, potential: null, xp: 0, xpToNext: 0};
        }
    });


    // 2. Update user's potential stats and initialize current/xp if new
    for (const statName of TRACKED_STATS) { // Iterate using TRACKED_STATS from service
        const calculatedPotential = newPotentials[statName];
        const userStat = playerStatsDoc.stats[statName];

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
        playerStatsDoc.stats = statCalculationService.applyXpAndLevelUp(playerStatsDoc.stats, awardedXpMap);
        console.log('[XP LOG] User stats after applying XP:', playerStatsDoc.stats);
    }

    playerStatsDoc.markModified('stats');

    // Save both documents
    await exerciseHistoryDoc.save();
    await playerStatsDoc.save();

    // --- End Stat and XP Processing ---

    // Fetch full user for response
    const fullUser = await getFullUser(userId);
    fullUser.id = fullUser._id;
    delete fullUser.passwordHash;
    delete fullUser._id;

    res.status(200).json({
      message: "Exercise logged successfully!",
      user: fullUser
    });

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
router.post('/:userId/recalculate-stats', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    if (req.user.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const exerciseHistoryDoc = await ExerciseHistory.findOne({ user: userId });
        const playerStatsDoc = await PlayerStats.findOne({ user: userId });

        const exerciseDbData = await statCalculationService.fetchExerciseDb();
        if (!exerciseDbData || exerciseDbData.length === 0) {
            return res.status(503).json({ message: 'Exercise database is currently unavailable or empty.' });
        }
        const statWeights = await statCalculationService.loadStatWeights();
         if (!statWeights) {
            return res.status(503).json({ error: 'Stat weights configuration is currently unavailable.' });
        }

        // Recalculate Potentials
        const potentialResults = await statCalculationService.calculatePotentialStats(exerciseHistoryDoc.history, exerciseDbData, statWeights);
        const { detailedContributions, ...newPotentials } = potentialResults; // strongestLiftsByExercise not directly used here unless we reset XP

        if (!playerStatsDoc.stats) playerStatsDoc.stats = {}; // Should be initialized by schema

        for (const statName of TRACKED_STATS) {
            const calculatedPotential = newPotentials[statName];
            const userStat = playerStatsDoc.stats[statName] || { current: null, potential: null, xp: 0, xpToNext: 0 }; // Ensure stat object exists

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
            playerStatsDoc.stats[statName] = userStat;
        }

        // Note: This recalculate route does NOT award new XP or re-evaluate XP based on history.
        // It primarily recalculates and updates potentials, and initializes current stats if they were null.

        playerStatsDoc.markModified('stats');
        await playerStatsDoc.save();

        const fullUser = await getFullUser(userId);
        fullUser.id = fullUser._id;
        delete fullUser.passwordHash;
        delete fullUser._id;

        fullUser.detailedContributions = detailedContributions; // Add contributions from potential calculation

        res.json({ message: 'Stats recalculated successfully.', user: fullUser });

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

// PUT /api/users/:id/preferences
router.put('/:id/preferences', authenticateToken, async (req, res) => {
  if (req.user.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.preferences = { ...user.preferences, ...req.body };
    await user.save();

    const fullUser = await getFullUser(user._id);
    fullUser.id = fullUser._id;
    delete fullUser.passwordHash;
    delete fullUser._id;

    res.status(200).json({ message: 'Preferences updated successfully', user: fullUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// PATCH /api/users/:id/profile
router.patch('/:id/profile', authenticateToken, async (req, res) => {
    const { id } = req.params;
    if (req.user.userId !== id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Update preferences (goals, constraints)
        if (req.body.trainingGoals) user.preferences.trainingGoals = req.body.trainingGoals;
        if (req.body.excludedEquipment) user.preferences.excludedEquipment = req.body.excludedEquipment;
        if (req.body.excludedMuscles) user.preferences.excludedMuscles = req.body.excludedMuscles;
        if (req.body.excludedExercises) user.preferences.excludedExercises = req.body.excludedExercises;

        // Also allow other preference updates if passed
        if (req.body.preferences) {
             user.preferences = { ...user.preferences, ...req.body.preferences };
        }

        await user.save();

        const fullUser = await getFullUser(id);
        fullUser.id = fullUser._id;
        delete fullUser.passwordHash;
        delete fullUser._id;
        delete fullUser.__v;

        res.status(200).json({ message: 'Profile updated successfully', user: fullUser });

    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// DELETE /api/users/:userId/exercises/:exerciseId
router.delete('/:userId/exercises/:exerciseId', authenticateToken, async (req, res) => {
  const { userId, exerciseId } = req.params;
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const exerciseHistoryDoc = await ExerciseHistory.findOne({ user: userId });
    if (!exerciseHistoryDoc) return res.status(404).json({ message: 'Exercise History not found' });

    const exerciseIndex = exerciseHistoryDoc.history.findIndex(ex => ex._id.toString() === exerciseId);
    if (exerciseIndex === -1) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    exerciseHistoryDoc.history.splice(exerciseIndex, 1);
    await exerciseHistoryDoc.save();

    const fullUser = await getFullUser(userId);
    fullUser.id = fullUser._id;
    delete fullUser.passwordHash;
    delete fullUser._id;

    res.status(200).json({ success: true, message: 'Exercise deleted successfully', user: fullUser });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ message: 'Failed to delete exercise' });
  }
});

// Quest Action Routes

const handleQuestAction = async (req, res, newStatus) => {
  const { userId, questId } = req.params;
  const { loggedExercises } = req.body;

  console.log(`[QUEST ACTION] Received action '${newStatus}' for userId: ${userId}, questId: ${questId}`);

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[QUEST ACTION] User not found for userId: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the specific quest document
    // We search by questId (the uuid), assuming it is unique enough or compound with userId
    const quest = await Quest.findOne({ user: userId, questId: questId });

    if (!quest) {
      console.error(`[QUEST ACTION] Quest with ID '${questId}' not found for user '${user.username}'.`);
      return res.status(404).json({ message: 'Quest not found' });
    }

    console.log(`[QUEST ACTION] Quest found: "${quest.title}". Updating status to '${newStatus}'.`);
    quest.status = newStatus;

    if (newStatus === 'accepted') {
        quest.startedAt = new Date();
    } else if (newStatus === 'completed') {
        quest.completedAt = new Date();
    }

    if (newStatus === 'completed' && Array.isArray(loggedExercises)) {
      const questExerciseById = new Map();
      const questExerciseByName = new Map();

      for (const questExercise of quest.exercises || []) {
        if (questExercise.exerciseId) {
          questExerciseById.set(questExercise.exerciseId, questExercise);
        }
        questExerciseByName.set((questExercise.name || '').toLowerCase(), questExercise);
      }

      const parsePositiveInt = (value, fallback = null) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          return fallback ?? null;
        }
        return Math.round(numeric);
      };

      const parseNonNegativeNumber = (value, fallback = null) => {
        if (value === undefined || value === null || value === '') {
          return fallback ?? null;
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
          return fallback ?? null;
        }
        return Math.round(numeric * 100) / 100;
      };

      const sanitizedLoggedExercises = [];

      for (const logged of loggedExercises) {
        if (!logged) continue;

        const questExercise =
          (logged.exerciseId && questExerciseById.get(logged.exerciseId)) ||
          questExerciseByName.get((logged.name || '').toLowerCase());

        if (!questExercise) continue;

        const sanitized = {
          exerciseId: questExercise.exerciseId || logged.exerciseId || null,
          name: questExercise.name,
          sets: parsePositiveInt(logged.sets, questExercise.sets ?? 1),
          reps: parsePositiveInt(logged.reps, questExercise.reps ?? null),
          duration: parsePositiveInt(logged.duration, questExercise.duration ?? null),
          weight: parseNonNegativeNumber(logged.weight, null),
        };

        if (sanitized.reps === null) delete sanitized.reps;
        if (sanitized.duration === null) delete sanitized.duration;
        if (sanitized.weight === null) delete sanitized.weight;

        sanitizedLoggedExercises.push(sanitized);
      }

      quest.userLoggedExercises = sanitizedLoggedExercises;

      try {
        const exerciseHistoryDoc = await ExerciseHistory.findOne({ user: userId });
        const playerStatsDoc = await PlayerStats.findOne({ user: userId });

        const exerciseDbData = await statCalculationService.fetchExerciseDb();
        const statWeights = await statCalculationService.loadStatWeights();
        const exerciseDbById = new Map(exerciseDbData.map(e => [e.id, e]));
        const exerciseDbByName = new Map(exerciseDbData.map(e => [e.name.toLowerCase(), e]));

        const categorize = (cat) => {
          const c = (cat || '').toLowerCase();
          if ([
            'powerlifting',
            'strength',
            'olympic weightlifting',
            'strongman',
            'plyometrics',
          ].includes(c)) return 'Lift';
          if (c === 'stretching') return 'Stretch';
          if (c === 'cardio') return 'Cardio';
          return 'Lift';
        };

        const newExerciseEntries = [];

        for (const ex of sanitizedLoggedExercises) {
          const metadata =
            (ex.exerciseId && exerciseDbById.get(ex.exerciseId)) ||
            exerciseDbByName.get(ex.name.toLowerCase());

          if (!metadata) continue;

          ex.exerciseId = metadata.id;
          const category = categorize(metadata.category);
          const entry = { date: new Date(), type: metadata.name, category };
          const setsCount = Math.max(1, ex.sets || 1);

          if (category === 'Lift') {
            entry.sets = Array.from({ length: setsCount }, () => ({ reps: ex.reps ?? null, weight: ex.weight ?? null }));
          } else if (category === 'Stretch') {
            entry.sets = Array.from({ length: setsCount }, () => ({ duration: ex.duration ?? null }));
          } else if (category === 'Cardio') {
            entry.duration = ex.duration ? ex.duration / 60 : 0; // seconds to minutes
          }

          if (!exerciseHistoryDoc.history) exerciseHistoryDoc.history = [];
          exerciseHistoryDoc.history.push(entry);
          newExerciseEntries.push({ entry, metadata });
        }

        if (newExerciseEntries.length > 0) {
          const potentialResults = await statCalculationService.calculatePotentialStats(
            exerciseHistoryDoc.history,
            exerciseDbData,
            statWeights
          );
          const { strongestLiftsByExercise, detailedContributions, ...newPotentials } = potentialResults;

          if (!playerStatsDoc.stats) playerStatsDoc.stats = {};
          TRACKED_STATS.forEach(statName => {
            if (!playerStatsDoc.stats[statName]) {
              playerStatsDoc.stats[statName] = { current: null, potential: null, xp: 0, xpToNext: 0 };
            }
            const calculatedPotential = newPotentials[statName];
            const userStat = playerStatsDoc.stats[statName];
            if (calculatedPotential !== null) {
              if (userStat.potential === null) {
                userStat.potential = calculatedPotential;
                userStat.current = Math.max(1, Math.round(0.10 * userStat.potential));
                userStat.xp = 0;
                userStat.xpToNext = statCalculationService.getXpToNext(userStat.current);
              } else {
                userStat.potential = calculatedPotential;
              }
            } else {
              userStat.potential = null;
              userStat.current = null;
              userStat.xp = 0;
              userStat.xpToNext = 0;
            }
          });

          for (const { entry, metadata } of newExerciseEntries) {
            const awardedXpMap = statCalculationService.calculateXpForExercise(
              entry,
              metadata,
              statWeights,
              strongestLiftsByExercise
            );
            playerStatsDoc.stats = statCalculationService.applyXpAndLevelUp(playerStatsDoc.stats, awardedXpMap);
          }

          playerStatsDoc.markModified('stats');
          await playerStatsDoc.save();
          await exerciseHistoryDoc.save();
        }
      } catch (err) {
        console.error('[QUEST ACTION] Error processing completion exercises:', err);
      }
    }

    await quest.save();
    console.log(`[QUEST ACTION] Quest status updated successfully.`);

    const fullUser = await getFullUser(userId);
    fullUser.id = fullUser._id;
    delete fullUser.passwordHash;
    delete fullUser._id;

    res.status(200).json({ success: true, message: `Quest ${newStatus} successfully`, user: fullUser });
  } catch (error) {
    console.error(`Error updating quest to ${newStatus}:`, error);
    res.status(500).json({ message: `Failed to update quest status to ${newStatus}` });
  }
};

// Middleware for quest actions to ensure authentication
const questActionMiddleware = (handler) => {
    return (req, res) => {
        // Authenticate first
        authenticateToken(req, res, () => {
             const { userId } = req.params;
             if (req.user.userId !== userId) {
                return res.status(403).json({ error: 'Forbidden' });
             }
             handler(req, res);
        });
    };
};


// POST /api/users/:userId/quests/:questId/accept
router.post('/:userId/quests/:questId/accept', questActionMiddleware((req, res) => handleQuestAction(req, res, 'accepted')));

// POST /api/users/:userId/quests/:questId/abandon
router.post('/:userId/quests/:questId/abandon', questActionMiddleware((req, res) => handleQuestAction(req, res, 'abandoned')));

// POST /api/users/:userId/quests/:questId/complete
router.post('/:userId/quests/:questId/complete', questActionMiddleware((req, res) => handleQuestAction(req, res, 'completed')));


module.exports = router;
