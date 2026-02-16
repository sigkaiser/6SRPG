const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const exercises = require('../data/exercises_v2.json');
const Quest = require('../models/Quest'); // Import Quest model

const DEFAULT_STATS_ORDER = [
  'upperBodyStrength',
  'lowerBodyStrength',
  'coreStrength',
  'cardioEndurance',
  'flexibilityMobility',
  'powerExplosiveness',
];

const CATEGORY_STAT_MAP = {
  conditioning: 'cardioEndurance',
  mobility: 'flexibilityMobility',
  power: 'powerExplosiveness',
  skill: 'coreStrength',
  strength: 'upperBodyStrength',
};

const GOAL_TO_STATS = {
  'increase upper body strength': ['upperBodyStrength'],
  'increase lower body strength': ['lowerBodyStrength'],
  'improve core strength': ['coreStrength'],
  'improve cardio endurance': ['cardioEndurance'],
  'improve flexibility mobility': ['flexibilityMobility'],
  'improve explosive power': ['powerExplosiveness'],
  'general fitness': DEFAULT_STATS_ORDER,
  'weight loss': ['cardioEndurance', 'upperBodyStrength', 'lowerBodyStrength'],
  'muscle hypertrophy (size)': ['upperBodyStrength', 'lowerBodyStrength'],
  'active recovery / injury rehab': ['flexibilityMobility', 'cardioEndurance'],
};

const LEVEL_ORDER = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
};

const UPPER_BODY_MUSCLES = new Set([
  'chest',
  'lats',
  'shoulders',
  'traps',
  'triceps',
  'biceps',
  'forearms',
  'neck',
  'middle back',
]);

const LOWER_BODY_MUSCLES = new Set([
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
]);

const CORE_MUSCLES = new Set([
  'abdominals',
  'lower back',
]);

const MAX_PROMPT_EXERCISES = 40;
const PRIORITY_STAT_LIMIT = 8;
const GENERAL_STAT_LIMIT = 4;
const MIN_PROMPT_EXERCISES = 12;

const toLowercaseSet = (values = []) => new Set(values.filter(Boolean).map((value) => value.toLowerCase()));

const categorizeExercise = (exercise) => {
  const stats = [];
  const categoryKey = (exercise.modality || '').toLowerCase();
  const categoryStat = CATEGORY_STAT_MAP[categoryKey];

  if (categoryStat) {
    stats.push(categoryStat);
  }

  let upperCount = 0;
  let lowerCount = 0;
  let coreCount = 0;

  for (const muscle of exercise.primaryMuscles || []) {
    const normalized = muscle.toLowerCase();

    if (UPPER_BODY_MUSCLES.has(normalized)) {
      upperCount += 1;
    }

    if (LOWER_BODY_MUSCLES.has(normalized)) {
      lowerCount += 1;
    }

    if (CORE_MUSCLES.has(normalized)) {
      coreCount += 1;
    }
  }

  const maxCount = Math.max(upperCount, lowerCount, coreCount);

  if (maxCount > 0) {
    if (upperCount === maxCount) {
      stats.push('upperBodyStrength');
    }

    if (lowerCount === maxCount) {
      stats.push('lowerBodyStrength');
    }

    if (coreCount === maxCount) {
      stats.push('coreStrength');
    }
  }

  if (!stats.length) {
    stats.push('upperBodyStrength');
  }

  return [...new Set(stats)];
};

const filterExercisesForUser = (preferences = {}) => {
  const {
    excludedExercises = [],
    excludedEquipment = [],
    excludedMuscles = [],
  } = preferences;

  const excludedExerciseNames = toLowercaseSet(excludedExercises);
  const excludedEquipmentSet = toLowercaseSet(excludedEquipment);
  const excludedMusclesSet = toLowercaseSet(excludedMuscles);

  let filtered = exercises.filter((exercise) => {
    if (excludedExerciseNames.has(exercise.name.toLowerCase())) {
      return false;
    }

    const equipmentValues = (exercise.equipment || []).map((item) => String(item).toLowerCase());
    if (excludedEquipmentSet.size && equipmentValues.some((equipment) => excludedEquipmentSet.has(equipment))) {
      return false;
    }

    if (
      excludedMusclesSet.size &&
      (exercise.primaryMuscles || []).some((muscle) => excludedMusclesSet.has(muscle.toLowerCase()))
    ) {
      return false;
    }

    return true;
  });

  if (!filtered.length) {
    filtered = exercises.filter((exercise) => {
      if (excludedExerciseNames.has(exercise.name.toLowerCase())) {
        return false;
      }
      const equipmentValues = (exercise.equipment || []).map((item) => String(item).toLowerCase());
      if (excludedEquipmentSet.size && equipmentValues.some((equipment) => excludedEquipmentSet.has(equipment))) {
        return false;
      }
      return true;
    });
  }

  if (!filtered.length) {
    filtered = exercises.filter((exercise) => !excludedExerciseNames.has(exercise.name.toLowerCase()));
  }

  if (!filtered.length) {
    filtered = [...exercises];
  }

  return filtered
    .map((exercise) => {
      const statOptions = categorizeExercise(exercise);
      return {
        exercise,
        statOptions,
        primaryStat: statOptions[0],
      };
    })
    .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
};

const determinePriorityStats = (trainingGoals = []) => {
  const stats = new Set();

  for (const goal of trainingGoals) {
    const normalized = (goal || '').toLowerCase();
    const mapped = GOAL_TO_STATS[normalized];

    if (mapped) {
      mapped.forEach((stat) => stats.add(stat));
    }
  }

  if (!stats.size) {
    DEFAULT_STATS_ORDER.forEach((stat) => stats.add(stat));
  }

  return stats;
};

const formatExerciseForPrompt = (exercise) => ({
  exerciseId: exercise.id,
  name: exercise.name,
  equipment: exercise.equipment || [],
  modality: exercise.modality,
  doseType: exercise.doseType,
  movementPatterns: (exercise.movementPatterns || []).slice(0, 2),
  primaryMuscles: (exercise.primaryMuscles || []).slice(0, 3),
  level: exercise.level,
});

const selectExercisesForPrompt = (filteredExercises, priorityStats) => {
  const groupedByStat = new Map();

  for (const item of filteredExercises) {
    const statKey = item.primaryStat || 'upperBodyStrength';

    if (!groupedByStat.has(statKey)) {
      groupedByStat.set(statKey, []);
    }

    groupedByStat.get(statKey).push(item);
  }

  for (const [statKey, list] of groupedByStat.entries()) {
    list.sort((a, b) => {
      const aLevel = LEVEL_ORDER[(a.exercise.level || '').toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
      const bLevel = LEVEL_ORDER[(b.exercise.level || '').toLowerCase()] ?? Number.MAX_SAFE_INTEGER;

      if (aLevel !== bLevel) {
        return aLevel - bLevel;
      }

      return a.exercise.name.localeCompare(b.exercise.name);
    });
  }

  const summary = {};
  const usedIds = new Set();
  const selectedItems = [];

  for (const stat of DEFAULT_STATS_ORDER) {
    summary[stat] = [];
  }

  const pickForStat = (stat, limit) => {
    const list = groupedByStat.get(stat) || [];

    for (const item of list) {
      if (selectedItems.length >= MAX_PROMPT_EXERCISES) {
        break;
      }

      if (summary[stat].length >= limit) {
        break;
      }

      if (usedIds.has(item.exercise.id)) {
        continue;
      }

      summary[stat].push(formatExerciseForPrompt(item.exercise));
      usedIds.add(item.exercise.id);
      selectedItems.push(item);
    }
  };

  for (const stat of DEFAULT_STATS_ORDER) {
    if (priorityStats.has(stat)) {
      pickForStat(stat, PRIORITY_STAT_LIMIT);
    }
  }

  for (const stat of DEFAULT_STATS_ORDER) {
    if (!priorityStats.has(stat)) {
      pickForStat(stat, GENERAL_STAT_LIMIT);
    }
  }

  if (selectedItems.length < MIN_PROMPT_EXERCISES) {
    for (const item of filteredExercises) {
      if (selectedItems.length >= MAX_PROMPT_EXERCISES) {
        break;
      }

      if (usedIds.has(item.exercise.id)) {
        continue;
      }

      const stat = item.primaryStat || 'upperBodyStrength';
      summary[stat].push(formatExerciseForPrompt(item.exercise));
      usedIds.add(item.exercise.id);
      selectedItems.push(item);
    }
  }

  return {
    promptSummary: summary,
    promptExercises: selectedItems,
  };
};

const buildPrompt = ({
  trainingGoals,
  excludedMuscles,
  excludedEquipment,
  excludedExercises,
  customInstructions,
  recentExerciseHistory,
  stats,
  allowedExercisesSnippet,
  priorityStats,
}) => {
  const priorityStatList = Array.from(priorityStats);
  const promptLines = [
    'You are a master game designer creating personalized fitness quests for a user in a gamified fitness app.',
    'Generate 3 to 5 RPG-style workout quests based on the following user data:',
    '',
    'User Profile:',
    `- Training Goals: ${trainingGoals.length ? trainingGoals.join(', ') : 'None specified'}`,
    `- Excluded Muscles: ${excludedMuscles.length ? excludedMuscles.join(', ') : 'None'}`,
    `- Excluded Equipment: ${excludedEquipment.length ? excludedEquipment.join(', ') : 'None'}`,
    `- Excluded Exercises: ${excludedExercises.length ? excludedExercises.join(', ') : 'None'}`,
    `- Custom Instructions: ${customInstructions || 'None'}`,
    `- Recent Exercise History (last 30 days): ${JSON.stringify(recentExerciseHistory, null, 2)}`,
    `- Current Stat Levels: ${JSON.stringify(stats, null, 2)}`,
    priorityStatList.length
      ? `- Priority Stats to Emphasize: ${priorityStatList.join(', ')}`
      : '- Priority Stats to Emphasize: None (use balanced variety)',
    '',
    'Allowed Exercises (select only from this list; reference "exerciseId" exactly as shown):',
    allowedExercisesSnippet,
    '',
    'Important rules:',
    '1. Use only exercises from the allowed list. Copy the provided "name" and include the matching "exerciseId" for each exercise.',
    '2. Each quest must include 1 to 3 exercises with numeric "sets" and must respect each exercise "doseType" from the allowed list.',
    '3. Keep recommendations aligned with the user\'s goals, respecting all exclusions and instructions.',
    '4. Return a valid JSON object with a top-level "quests" array. Do not include any extra commentary before or after the JSON.',
    '5. Each exercise object in the response must include: exerciseId, name, sets, and either reps or duration. Use reps for doseType values reps/contacts and duration for doseType values time/distance/intervals/holds. weightPercent is optional but, if present, must be a positive number.',
  ];

  return promptLines.join('\n');
};

const parsePositiveInteger = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.round(numeric);
};

const parsePositiveNumber = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.round(numeric * 100) / 100;
};

const sanitizeExerciseFromModel = (exercise, allowedExerciseMap) => {
  if (!exercise || typeof exercise !== 'object') {
    return null;
  }

  let exerciseId = exercise.exerciseId;
  let allowed = null;

  if (exerciseId && typeof exerciseId === 'string') {
    allowed = allowedExerciseMap.get(exerciseId);
  }

  if (!allowed && exercise.name && typeof exercise.name === 'string') {
    const targetName = exercise.name.trim().toLowerCase();
    for (const item of allowedExerciseMap.values()) {
      if (item.exercise.name.toLowerCase() === targetName) {
        allowed = item;
        exerciseId = item.exercise.id;
        break;
      }
    }
  }

  if (!allowed) {
    return null;
  }

  const sets = parsePositiveInteger(exercise.sets);

  if (sets === null) {
    return null;
  }

  const reps = exercise.reps !== undefined ? parsePositiveInteger(exercise.reps) : null;
  const duration = exercise.duration !== undefined ? parsePositiveInteger(exercise.duration) : null;
  const doseType = String(allowed.exercise.doseType || '').toLowerCase();
  const requiresDuration = ['time', 'distance', 'intervals', 'holds'].includes(doseType);

  if (requiresDuration) {
    if (duration === null) {
      return null;
    }
  } else if (reps === null && duration === null) {
    return null;
  }

  const sanitized = {
    exerciseId: allowed.exercise.id,
    name: allowed.exercise.name,
    sets,
    doseType: allowed.exercise.doseType,
  };

  if (reps !== null) {
    sanitized.reps = reps;
  }

  if (duration !== null) {
    sanitized.duration = duration;
  }

  if (exercise.weightPercent !== undefined && exercise.weightPercent !== null) {
    const weightPercent = parsePositiveNumber(exercise.weightPercent);

    if (weightPercent === null) {
      return null;
    }

    sanitized.weightPercent = weightPercent;
  }

  return sanitized;
};

// Updated signature to accept separated models
const generatePersonalDailyQuests = async (user, stats, exerciseHistory) => {
  console.log('--- Generating Personal Daily Quests ---');

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Cannot generate quests.');
    throw new Error('OPENAI_API_KEY is not set. Cannot generate quests.');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const preferences = user.preferences || {};
  const {
    trainingGoals = [],
    excludedMuscles = [],
    excludedEquipment = [],
    excludedExercises = [],
    customInstructions = '',
  } = preferences;

  // Use the history array from the ExerciseHistory document
  const historyArray = exerciseHistory ? exerciseHistory.history : [];

  const recentExerciseHistory = historyArray.filter((entry) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(entry.date) > thirtyDaysAgo;
  });

  // Extract stats object from PlayerStats document
  const statsObj = stats ? stats.stats : {};

  const filteredExercises = filterExercisesForUser(preferences);
  const priorityStats = determinePriorityStats(trainingGoals);
  const { promptSummary, promptExercises } = selectExercisesForPrompt(filteredExercises, priorityStats);
  const allowedExerciseMap = new Map(promptExercises.map((item) => [item.exercise.id, item]));
  const allowedExercisesSnippet = JSON.stringify(promptSummary, null, 2);

  console.log('Allowed exercise pool size:', promptExercises.length);

  const prompt = buildPrompt({
    trainingGoals,
    excludedMuscles,
    excludedEquipment,
    excludedExercises,
    customInstructions,
    recentExerciseHistory,
    stats: statsObj,
    allowedExercisesSnippet,
    priorityStats,
  });

  console.log('--- Prompt for OpenAI ---');
  console.log(prompt);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    console.log('--- Raw Response from OpenAI ---');
    console.log(JSON.stringify(response, null, 2));

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI response did not include content.');
    }

    const parsed = JSON.parse(content);
    const quests = parsed.quests;

    if (!Array.isArray(quests)) {
      console.error('Invalid response from OpenAI: "quests" array not found or not an array.');
      throw new Error('Invalid response from OpenAI');
    }

    console.log('--- Parsed Quests ---');
    console.log(JSON.stringify(quests, null, 2));

    const validatedQuests = [];

    for (const quest of quests) {
      if (!quest || typeof quest !== 'object') {
        continue;
      }

      if (!quest.title || !quest.rank || !quest.description || !quest.primaryStat) {
        continue;
      }

      if (!Array.isArray(quest.exercises) || quest.exercises.length === 0) {
        continue;
      }

      const validatedExercises = [];

      for (const exercise of quest.exercises) {
        const sanitized = sanitizeExerciseFromModel(exercise, allowedExerciseMap);

        if (!sanitized) {
          console.log(`Rejected exercise due to validation failure: ${JSON.stringify(exercise)}`);
          continue;
        }

        validatedExercises.push(sanitized);
      }

      if (validatedExercises.length === 0) {
        console.log(`Discarding quest "${quest.title}" because all exercises were invalid.`);
        continue;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      validatedQuests.push({
        user: user._id, // Assign to user
        ...quest,
        exercises: validatedExercises,
        questId: uuidv4(),
        type: 'Daily', // Explicitly mark as Daily
        createdAt: now,
        expiresAt,
        status: 'available',
      });
    }

    console.log('--- Validated Quests ---');
    console.log(JSON.stringify(validatedQuests, null, 2));

    // Mark old available daily quests as expired
    await Quest.updateMany(
      { user: user._id, type: 'Daily', status: 'available' },
      { $set: { status: 'expired' } }
    );
    console.log('--- Old available daily quests marked as expired ---');

    // Insert new quests
    if (validatedQuests.length > 0) {
      await Quest.insertMany(validatedQuests);
    }
    console.log('--- New quests saved to Quest collection ---');

    return validatedQuests;
  } catch (error) {
    console.error('Error generating daily quests:', error);
    return [];
  }
};

module.exports = generatePersonalDailyQuests;
