const OpenAI = require('openai');
const Fuse = require('fuse.js');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const ExerciseAlias = require('../models/ExerciseAlias');
const exercises = require('../data/exercises.json');

const normalizeExerciseName = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const singularizeToken = (token) => {
  if (token.length <= 3) return token;
  if (/ies$/.test(token)) return token.slice(0, -3) + 'y';
  if (/ses$/.test(token) && !/sses$/.test(token)) return token.slice(0, -2);
  if (/s$/.test(token) && !/ss$/.test(token) && !/us$/.test(token)) return token.slice(0, -1);
  return token;
};

const getUniqueTokens = (value) => {
  const normalized = normalizeExerciseName(value);
  if (!normalized) {
    return [];
  }

  return [...new Set(normalized.split(' ').filter(Boolean).map(singularizeToken))];
};

const computeDiceCoefficient = (aTokens = [], bTokens = []) => {
  if (!aTokens.length || !bTokens.length) {
    return 0;
  }

  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  let intersection = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }

  return (2 * intersection) / (setA.size + setB.size);
};

const escapeRegExp = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HEAVY_EQUIPMENT_TOKENS = new Set([
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'smith',
  'band',
  'kettlebell',
  'plate',
  'resistance',
  'bench',
  'sled',
  'yoke',
  'press',
  'curl',
  'squat',
  'deadlift',
  'snatch',
  'clean',
  'row',
  'pullup',
  'chinup',
  'dip',
]);

const CARDIO_TOKENS = new Set([
  'walk',
  'walking',
  'run',
  'running',
  'jog',
  'jogging',
  'cycle',
  'cycling',
  'bike',
  'biking',
  'row',
  'rowing',
  'swim',
  'swimming',
  'cardio',
  'sprint',
  'skipping',
  'jumping',
  'climb',
  'climbing',
  'hike',
  'hiking',
]);

const TOKEN_FREQUENCY_THRESHOLD = 45;
const MATCH_CONFIDENCE_THRESHOLD = 0.45;

const exerciseMatchData = exercises.map((exercise) => {
  const tokens = getUniqueTokens(exercise.name);
  return {
    exercise,
    normalizedName: normalizeExerciseName(exercise.name),
    tokens,
    meaningfulTokens: [],
  };
});

const tokenFrequency = new Map();

for (const entry of exerciseMatchData) {
  for (const token of entry.tokens) {
    tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
  }
}

for (const entry of exerciseMatchData) {
  entry.meaningfulTokens = entry.tokens.filter(
    (token) => (tokenFrequency.get(token) || 0) <= TOKEN_FREQUENCY_THRESHOLD
  );
}

const exerciseNameLookup = new Map();

for (const entry of exerciseMatchData) {
  exerciseNameLookup.set(entry.exercise.name.toLowerCase(), entry);
}

const fuse = new Fuse(exerciseMatchData, {
  keys: ['exercise.name'],
  includeScore: true,
  threshold: 0.45,
  ignoreLocation: true,
});

const evaluateCandidate = (candidateEntry, context, fuseScore) => {
  const {
    tokens,
    meaningfulTokens,
    normalizedInput,
    inputHasHeavyToken,
    inputHasCardioToken,
  } = context;

  const baseScore = 1 - fuseScore;
  const tokenDice = computeDiceCoefficient(tokens, candidateEntry.tokens);
  const meaningfulDice = computeDiceCoefficient(meaningfulTokens, candidateEntry.meaningfulTokens);
  const sharedMeaningfulCount = meaningfulTokens.filter((token) =>
    candidateEntry.tokens.includes(token)
  ).length;

  let combinedScore = baseScore * 0.5 + tokenDice * 0.3 + meaningfulDice * 0.2;

  if (meaningfulTokens.length > 0 && sharedMeaningfulCount === 0) {
    combinedScore -= 0.2;
  }

  if (meaningfulTokens.length > 0 && meaningfulTokens.every((token) => candidateEntry.tokens.includes(token))) {
    combinedScore += 0.05;
  }

  if (normalizedInput && candidateEntry.normalizedName.includes(normalizedInput)) {
    combinedScore += 0.05;
  }

  if (normalizedInput && normalizedInput.includes(candidateEntry.normalizedName)) {
    combinedScore += 0.05;
  }

  const candidateHasHeavyToken = candidateEntry.tokens.some((token) => HEAVY_EQUIPMENT_TOKENS.has(token));
  const candidateHasCardioToken = candidateEntry.tokens.some((token) => CARDIO_TOKENS.has(token));

  if (!inputHasHeavyToken && candidateHasHeavyToken && tokenDice < 0.6) {
    combinedScore -= 0.08;
  }

  if (inputHasCardioToken && candidateHasCardioToken) {
    combinedScore += 0.04;
  }

  combinedScore = Math.max(0, Math.min(1, combinedScore));

  return {
    candidateEntry,
    combinedScore,
    fuseScore,
  };
};

const gatherSearchResults = (rawQuery, normalizedQuery) => {
  const resultsByName = new Map();

  const pushResults = (query) => {
    if (!query) {
      return;
    }

    for (const result of fuse.search(query)) {
      const key = result.item.exercise.name;
      const existing = resultsByName.get(key);

      if (!existing || result.score < existing.score) {
        resultsByName.set(key, result);
      }
    }
  };

  pushResults(rawQuery);

  if (normalizedQuery && normalizedQuery !== rawQuery) {
    pushResults(normalizedQuery);
  }

  return Array.from(resultsByName.values()).sort((a, b) => a.score - b.score);
};

const findExerciseMatch = async (exerciseName) => {
  if (!exerciseName) {
    return null;
  }

  const normalizedInput = normalizeExerciseName(exerciseName);
  const tokens = getUniqueTokens(exerciseName);
  const meaningfulTokens = tokens.filter(
    (token) => (tokenFrequency.get(token) || 0) <= TOKEN_FREQUENCY_THRESHOLD
  );
  const inputHasHeavyToken = tokens.some((token) => HEAVY_EQUIPMENT_TOKENS.has(token));
  const inputHasCardioToken = tokens.some((token) => CARDIO_TOKENS.has(token));

  const directMatch = exerciseNameLookup.get(exerciseName.toLowerCase());

  if (directMatch) {
    return {
      matchedExercise: directMatch.exercise,
      matchType: 'exact-name',
      confidence: 1,
      normalizedOriginalName: normalizedInput,
    };
  }

  const aliasMatch = await ExerciseAlias.findOne({
    $or: [
      { normalizedOriginalName: normalizedInput },
      { originalName: { $regex: new RegExp(`^${escapeRegExp(exerciseName)}$`, 'i') } },
    ],
  }).lean();

  if (aliasMatch) {
    const aliasExerciseEntry = exerciseNameLookup.get(aliasMatch.matchedName.toLowerCase());

    if (aliasExerciseEntry) {
      return {
        matchedExercise: aliasExerciseEntry.exercise,
        matchType: 'alias',
        confidence: 1 - (aliasMatch.confidenceScore ?? 0),
        normalizedOriginalName: normalizedInput,
        aliasDocument: aliasMatch,
      };
    }
  }

  if (!tokens.length) {
    return null;
  }

  const searchResults = gatherSearchResults(exerciseName, normalizedInput).slice(0, 20);

  if (searchResults.length === 0) {
    return null;
  }

  const context = {
    tokens,
    meaningfulTokens,
    normalizedInput,
    inputHasHeavyToken,
    inputHasCardioToken,
  };

  let bestMatch = null;

  for (const result of searchResults) {
    const evaluation = evaluateCandidate(result.item, context, result.score);

    if (!bestMatch || evaluation.combinedScore > bestMatch.combinedScore) {
      bestMatch = evaluation;
    }
  }

  if (bestMatch && bestMatch.combinedScore >= MATCH_CONFIDENCE_THRESHOLD) {
    return {
      matchedExercise: bestMatch.candidateEntry.exercise,
      matchType: 'fuzzy',
      confidence: bestMatch.combinedScore,
      normalizedOriginalName: normalizedInput,
    };
  }

  return null;
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
  console.log('User:', JSON.stringify(user, null, 2));

  // 1. Gather user data
  const { preferences, exerciseHistory, stats } = user;
  const {
    trainingGoals,
    excludedMuscles,
    excludedEquipment,
    excludedExercises,
    customInstructions,
  } = preferences;

  const recentExerciseHistory = exerciseHistory.filter(entry => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(entry.date) > thirtyDaysAgo;
  });

  // 2. Construct the prompt
  const prompt = `
    You are a master game designer creating personalized fitness quests for a user in a gamified fitness app.
    Generate 3 to 5 RPG-style workout quests based on the following user data:

    User Profile:
    - Training Goals: ${trainingGoals.join(', ')}
    - Excluded Muscles: ${excludedMuscles.join(', ')}
    - Excluded Equipment: ${excludedEquipment.join(', ')}
    - Excluded Exercises: ${excludedExercises.join(', ')}
    - Custom Instructions: ${customInstructions}
    - Recent Exercise History (last 30 days): ${JSON.stringify(recentExerciseHistory, null, 2)}
    - Current Stat Levels: ${JSON.stringify(stats, null, 2)}

    Please return the quests in a valid JSON array format, under a "quests" key. Each quest object in the array must include:
    - title: A creative and engaging title for the quest (e.g., "The Gauntlet of Strength", "Serpent's Stretch").
    - rank: A difficulty rank from "G" (easiest) to "S" (hardest).
    - description: Flavorful text that makes the workout sound like an epic adventure.
    - primaryStat: The main stat this quest will improve (one of: "upperBodyStrength", "lowerBodyStrength", "coreStrength", "cardioEndurance", "flexibilityMobility", "powerExplosiveness").
    - exercises: An array of 1 to 3 exercise objects. Each exercise object must have:
      - name: The name of the exercise.
      - sets: The number of sets.
      - reps: The number of repetitions (for strength exercises).
      - duration: The duration in seconds (for stretching or cardio exercises).
      - weightPercent: (Optional) A percentage of the user's 1RM for weighted exercises.

    Ensure the generated JSON is valid and follows the specified structure. Do not include any extra text or explanations outside of the JSON array.
  `;
  console.log('--- Prompt for OpenAI ---');
  console.log(prompt);

  try {
    // 3. Send the prompt to GPT-4
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    console.log('--- Raw Response from OpenAI ---');
    console.log(JSON.stringify(response, null, 2));

    const quests = JSON.parse(response.choices[0].message.content).quests;

    // 4. Parse and validate the LLM response
    if (!quests || !Array.isArray(quests)) {
      console.error('Invalid response from OpenAI: "quests" array not found or not an array.');
      throw new Error('Invalid response from OpenAI');
    }

    console.log('--- Parsed Quests ---');
    console.log(JSON.stringify(quests, null, 2));

    const validatedQuests = [];

    for (const quest of quests) {
      let questIsValid = true;
      const validatedExercises = [];

      for (const exercise of quest.exercises) {
        const match = await findExerciseMatch(exercise.name);

        if (!match || !match.matchedExercise) {
          questIsValid = false;
          console.log(`No confident match for exercise: ${exercise.name}. Discarding quest: "${quest.title}"`);
          break;
        }

        validatedExercises.push({ ...exercise, name: match.matchedExercise.name });

        if (match.matchType === 'fuzzy') {
          const normalizedOriginalName =
            match.normalizedOriginalName || normalizeExerciseName(exercise.name);
          const matchedNameLower = match.matchedExercise.name.toLowerCase();
          const confidenceScore = Math.max(0, 1 - match.confidence);
          const aliasFilter = {
            $or: [
              { normalizedOriginalName, matchedNameLower },
              {
                originalName: { $regex: new RegExp(`^${escapeRegExp(exercise.name)}$`, 'i') },
                matchedName: match.matchedExercise.name,
              },
            ],
          };
          const aliasPayload = {
            originalName: exercise.name,
            normalizedOriginalName,
            matchedName: match.matchedExercise.name,
            matchedNameLower,
          };

          try {
            const existingAlias = await ExerciseAlias.findOne(aliasFilter);

            if (existingAlias) {
              const updatePayload = { ...aliasPayload };

              if (
                existingAlias.confidenceScore === undefined ||
                existingAlias.confidenceScore > confidenceScore
              ) {
                updatePayload.confidenceScore = confidenceScore;
              }

              await ExerciseAlias.findByIdAndUpdate(
                existingAlias._id,
                { $set: updatePayload },
                { new: true }
              );
            } else {
              await ExerciseAlias.create({ ...aliasPayload, confidenceScore });
            }

            console.log(
              `Exercise alias saved: ${exercise.name} -> ${match.matchedExercise.name} (confidence: ${match.confidence.toFixed(3)})`
            );
          } catch (aliasError) {
            console.error('Failed to persist exercise alias', aliasError);
          }
        } else if (match.matchType === 'alias') {
          console.log(`Exercise alias reused: ${exercise.name} -> ${match.matchedExercise.name}`);
        }
      }

      if (questIsValid) {
        // 7. For validated quests, add metadata
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        validatedQuests.push({
          ...quest,
          exercises: validatedExercises,
          questId: uuidv4(),
          createdAt: now,
          expiresAt: expiresAt,
          status: 'available',
        });
      }
    }

    console.log('--- Validated Quests ---');
    console.log(JSON.stringify(validatedQuests, null, 2));

    // 8. Save quests to user
    const now = new Date();
    // Filter out old available quests, keeping non-expired active/completed ones.
    const questsToKeep = user.dailyQuests.filter(quest => quest.status !== 'available' && quest.expiresAt > now);
    user.dailyQuests = [...questsToKeep, ...validatedQuests];
    user.markModified('dailyQuests'); // Explicitly mark the array as modified
    await user.save();
    console.log('--- Quests saved to user ---');

    return validatedQuests;

  } catch (error) {
    console.error('Error generating daily quests:', error);
    // In a real app, you might want to return a user-friendly error or fallback quests
    return [];
  }
};

module.exports = generatePersonalDailyQuests;
