const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const exercises = require('../data/exercises.json');

const DEFAULT_STATS_ORDER = [
  'upperBodyStrength',
  'lowerBodyStrength',
  'coreStrength',
  'cardioEndurance',
  'flexibilityMobility',
  'powerExplosiveness',
];

const CATEGORY_STAT_MAP = {
  cardio: 'cardioEndurance',
  stretching: 'flexibilityMobility',
  plyometrics: 'powerExplosiveness',
  'olympic weightlifting': 'powerExplosiveness',
  powerlifting: 'powerExplosiveness',
  strongman: 'powerExplosiveness',
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
  const categoryKey = (exercise.category || '').toLowerCase();
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

    // Normalize equipment. If null/undefined, treat as 'body only' for filtering purposes
    // if 'body only' is explicitly excluded. Or keep it simple: check if the value exists.
    // However, if the user excludes 'body only', we should probably exclude null equipment exercises too.
    const equipment = (exercise.equipment || 'body only').toLowerCase();
    if (excludedEquipmentSet.size && excludedEquipmentSet.has(equipment)) {
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

  // Fallback Strategy:
  // 1. If empty, drop muscle filters but keep equipment and exercise name exclusions.
  if (!filtered.length) {
    filtered = exercises.filter((exercise) => {
      if (excludedExerciseNames.has(exercise.name.toLowerCase())) {
        return false;
      }
      const equipment = (exercise.equipment || 'body only').toLowerCase();
      if (excludedEquipmentSet.size && excludedEquipmentSet.has(equipment)) {
        return false;
      }
      return true;
    });
  }

  // 2. If still empty, drop equipment filters but keep exercise name exclusions.
  if (!filtered.length) {
    filtered = exercises.filter((exercise) => !excludedExerciseNames.has(exercise.name.toLowerCase()));
  }

  // 3. If still empty, return all exercises (last resort).
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
  equipment: exercise.equipment || 'body only',
  category: exercise.category,
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
    '2. Each quest must include 1 to 3 exercises with numeric "sets" and either "reps" (for strength/power work) or "duration" in seconds (for cardio/stretching).',
    '3. Keep recommendations aligned with the user\'s goals, respecting all exclusions and instructions.',
    '4. Return a valid JSON object with a top-level "quests" array. Do not include any extra commentary before or after the JSON.',
    '5. Each exercise object in the response must include: exerciseId, name, sets, and either reps or duration. weightPercent is optional but, if present, must be a positive number.',
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

  const exerciseId = exercise.exerciseId;

  if (!exerciseId || typeof exerciseId !== 'string') {
    return null;
  }

  const allowed = allowedExerciseMap.get(exerciseId);

  if (!allowed) {
    return null;
  }

  const sets = parsePositiveInteger(exercise.sets);

  if (sets === null) {
    return null;
  }

  const reps = exercise.reps !== undefined ? parsePositiveInteger(exercise.reps) : null;
  const duration = exercise.duration !== undefined ? parsePositiveInteger(exercise.duration) : null;
  const category = (allowed.exercise.category || '').toLowerCase();
  const force = (allowed.exercise.force || '').toLowerCase();
  const isStatic = force === 'static';
  const requiresDuration = category === 'cardio' || category === 'stretching' || isStatic;

  if (requiresDuration) {
    if (duration === null) {
      return null;
    }
  } else if (reps === null && duration === null) {
    // If it's a strength exercise (not requiring duration), we typically expect reps.
    // However, some might be time-based. We allow either reps OR duration, or both.
    // But at least one must be present.
    return null;
  }

  const sanitized = {
    exerciseId: allowed.exercise.id,
    name: allowed.exercise.name,
    sets,
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

const generatePersonalDailyQuests = async (user) => {
  console.log('--- Generating Personal Daily Quests ---');

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Cannot generate quests.');
    throw new Error('OPENAI_API_KEY is not set. Cannot generate quests.');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { preferences = {}, exerciseHistory = [], stats = {} } = user;
  const {
    trainingGoals = [],
    excludedMuscles = [],
    excludedEquipment = [],
    excludedExercises = [],
    customInstructions = '',
  } = preferences;

  const recentExerciseHistory = exerciseHistory.filter((entry) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(entry.date) > thirtyDaysAgo;
  });

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
    stats,
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

      let questIsValid = true;
      const validatedExercises = [];

      for (const exercise of quest.exercises) {
        const sanitized = sanitizeExerciseFromModel(exercise, allowedExerciseMap);

        if (!sanitized) {
          questIsValid = false;
          console.log(`Rejected exercise due to validation failure: ${JSON.stringify(exercise)}`);
          break;
        }

        validatedExercises.push(sanitized);
      }

      if (!questIsValid) {
        console.log(`Discarding quest "${quest.title}" because one or more exercises were invalid.`);
        continue;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      validatedQuests.push({
        ...quest,
        exercises: validatedExercises,
        questId: uuidv4(),
        createdAt: now,
        expiresAt,
        status: 'available',
      });
    }

    console.log('--- Validated Quests ---');
    console.log(JSON.stringify(validatedQuests, null, 2));

    const now = new Date();
    const questsToKeep = user.dailyQuests.filter(
      (quest) => quest.status !== 'available' && quest.expiresAt > now
    );
    user.dailyQuests = [...questsToKeep, ...validatedQuests];
    user.markModified('dailyQuests');
    await user.save();
    console.log('--- Quests saved to user ---');

    return validatedQuests;
  } catch (error) {
    console.error('Error generating daily quests:', error);
    return [];
  }
};

module.exports = generatePersonalDailyQuests;
