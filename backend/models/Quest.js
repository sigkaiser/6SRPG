const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  questId: { type: String, required: true }, // Unique identifier for the quest definition (or instance ID)

  // Quest details
  title: { type: String, required: true }, // mapped from 'name' or 'title'
  description: { type: String },
  rank: { type: String, enum: ["G", "F", "E", "D", "C", "B", "A", "S"] },
  primaryStat: { type: String, enum: ["upperBodyStrength", "lowerBodyStrength", "coreStrength", "cardioEndurance", "flexibilityMobility", "powerExplosiveness"] },

  // Type: 'Daily' corresponds to dailyQuests, 'Main' or 'Side' could correspond to active/completedQuests
  type: { type: String, enum: ['Daily', 'Main', 'Side', 'Event'], default: 'Daily' },

  status: { type: String, enum: ['available', 'accepted', 'completed', 'abandoned', 'expired', 'failed'], default: 'available' },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },

  // Requirements (for daily quests)
  exercises: [{
    exerciseId: { type: String },
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number },
    duration: { type: Number },
    weightPercent: { type: Number }
  }],

  // Progress tracking
  userLoggedExercises: [{
    exerciseId: { type: String },
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number },
    duration: { type: Number },
    weight: { type: Number }
  }]

}, { timestamps: true });

// Compound index for efficient querying
QuestSchema.index({ user: 1, status: 1 });
QuestSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Quest', QuestSchema);
