const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subschemas

const SetSchema = new Schema({
  reps: { type: Number },
  weight: { type: Number },
  duration: { type: Number } // in seconds for stretching
}, { _id: false });

const ExerciseSchema = new Schema({
  date: { type: Date, default: Date.now },
  type: String, // e.g., "Push-ups", "Barbell Squat"
  category: String, // "Lift", "Stretch", "Cardio"
  sets: [SetSchema],
  duration: { type: Number }, // in minutes for cardio
  intensity: { type: Number } // METs for cardio
});

const LevelProgressSchema = new Schema({
  levelId: String,
  status: { type: String, enum: ['cleared', 'failed', 'in_progress'] },
  attempts: Number,
  lastAttemptDate: Date
});

const QuestSchema = new Schema({
  questId: String,
  name: String,
  status: { type: String, enum: ['active', 'completed'] },
  startedAt: Date,
  completedAt: Date
});

const ItemSchema = new Schema({
  itemId: String,
  name: String,
  type: String, // e.g., "weapon", "armor", "consumable"
  quantity: { type: Number, default: 1 },
  equipped: { type: Boolean, default: false }
});

const DailyQuestSchema = new Schema({
  questId: { type: String, required: true },
  title: { type: String, required: true },
  rank: { type: String, enum: ["G", "F", "E", "D", "C", "B", "A", "S"], required: true },
  description: { type: String, required: true },
  primaryStat: { type: String, enum: ["upperBodyStrength", "lowerBodyStrength", "coreStrength", "cardioEndurance", "flexibilityMobility", "powerExplosiveness"], required: true },
  exercises: [{
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number },
    duration: { type: Number },
    weightPercent: { type: Number }
  }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ["available", "accepted", "completed", "abandoned", "expired"], default: "available" },
  userLoggedExercises: [{
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number },
    duration: { type: Number },
    weight: { type: Number }
  }]
});

// Main User Schema

const UserSchema = new Schema({
  // 1. Registration Data
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // bcrypt hash
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },

  // 2. Game Data
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  stats: {
    upperBodyStrength: {
      current: { type: Number, default: null },
      potential: { type: Number, default: null },
      xp: { type: Number, default: 0 },
      xpToNext: { type: Number, default: 0 }
    },
    lowerBodyStrength: {
      current: { type: Number, default: null },
      potential: { type: Number, default: null },
      xp: { type: Number, default: 0 },
      xpToNext: { type: Number, default: 0 }
    },
    coreStrength: {
      current: { type: Number, default: null },
      potential: { type: Number, default: null },
      xp: { type: Number, default: 0 },
      xpToNext: { type: Number, default: 0 }
    },
    powerExplosiveness: {
      current: { type: Number, default: null },
      potential: { type: Number, default: null },
      xp: { type: Number, default: 0 },
      xpToNext: { type: Number, default: 0 }
    },
    flexibilityMobility: {
      current: { type: Number, default: null },
      potential: { type: Number, default: null },
      xp: { type: Number, default: 0 },
      xpToNext: { type: Number, default: 0 }
    },
    cardioEndurance: { // Added cardioEndurance
      current: { type: Number, default: null },
      potential: { type: Number, default: null },
      xp: { type: Number, default: 0 },
      xpToNext: { type: Number, default: 0 }
    }
    // Vitality is intentionally omitted
  },
  titles: [String],
  achievements: [String],
  inventory: [ItemSchema],
  equippedItems: [ItemSchema],
  levelProgress: [LevelProgressSchema],
  completedQuests: [QuestSchema],
  activeQuests: [QuestSchema],
  dailyQuests: [DailyQuestSchema],

  // 3. Exercise History
  exerciseHistory: [ExerciseSchema],

  // 4. Optional Additions
  lastLogin: Date,
  dailyLoginStreak: { type: Number, default: 0 },
  preferences: {
    darkMode: { type: Boolean, default: false },
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    trainingGoals: { type: [String], default: [] },
    excludedEquipment: { type: [String], default: [] },
    excludedMuscles: { type: [String], default: [] },
    excludedExercises: { type: [String], default: [] },
    customInstructions: { type: String, default: '' }
  }

}, { timestamps: true });

// Hide sensitive/internal fields when converting to JSON
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
  }
});

module.exports = mongoose.model('User', UserSchema);
