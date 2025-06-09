const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subschemas

const ExerciseSchema = new Schema({
  date: { type: Date, default: Date.now },
  type: String, // e.g., "Push-ups", "Barbell Squat"
  sets: Number,
  reps: Number,
  weight: Number // Optional for bodyweight
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
    upperBodyStrength: { type: Number, default: 5 },
    lowerBodyStrength: { type: Number, default: 5 },
    coreStrength: { type: Number, default: 5 },
    powerExplosiveness: { type: Number, default: 5 },
    flexibilityMobility: { type: Number, default: 5 }
  },
  titles: [String],
  achievements: [String],
  inventory: [ItemSchema],
  equippedItems: [ItemSchema],
  levelProgress: [LevelProgressSchema],
  completedQuests: [QuestSchema],
  activeQuests: [QuestSchema],

  // 3. Exercise History
  exerciseHistory: [ExerciseSchema],

  // 4. Optional Additions
  lastLogin: Date,
  dailyLoginStreak: { type: Number, default: 0 },
  preferences: {
    darkMode: { type: Boolean, default: false },
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' }
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
