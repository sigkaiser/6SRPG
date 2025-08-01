const OpenAI = require('openai');
const Fuse = require('fuse.js');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const ExerciseAlias = require('../models/ExerciseAlias');
const exercises = require('../data/exercises.json');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generatePersonalDailyQuests = async (user) => {
  console.log('--- Generating Personal Daily Quests ---');
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

    // 5. Fuzzy match exercises
    const fuse = new Fuse(exercises, {
      keys: ['name'],
      includeScore: true,
      threshold: 0.3,
    });

    for (const quest of quests) {
      let questIsValid = true;
      const validatedExercises = [];

      for (const exercise of quest.exercises) {
        const exactMatch = exercises.find(e => e.name.toLowerCase() === exercise.name.toLowerCase());

        if (exactMatch) {
          validatedExercises.push({ ...exercise, name: exactMatch.name });
        } else {
          const results = fuse.search(exercise.name);
          if (results.length > 0 && results[0].score <= 0.15) {
            const matchedExercise = results[0].item;
            validatedExercises.push({ ...exercise, name: matchedExercise.name });

            // 6. Log the alias
            const exerciseAlias = new ExerciseAlias({
              originalName: exercise.name,
              matchedName: matchedExercise.name,
              confidenceScore: results[0].score,
            });
            await exerciseAlias.save();
            console.log(`Exercise alias saved: ${exercise.name} -> ${matchedExercise.name}`);
          } else {
            questIsValid = false;
            console.log(`No confident match for exercise: ${exercise.name}. Discarding quest: "${quest.title}"`);
            break; // Discard the whole quest if one exercise doesn't match
          }
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
    user.dailyQuests = user.dailyQuests.filter(quest => quest.expiresAt > now);
    user.dailyQuests.push(...validatedQuests);
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
