const mongoose = require('mongoose');
const { Schema } = mongoose;

const LevelProgressSchema = new Schema({
  levelId: String,
  status: { type: String, enum: ['cleared', 'failed', 'in_progress'] },
  attempts: Number,
  lastAttemptDate: Date
});

const PlayerStatsSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

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
    cardioEndurance: {
      current: { type: Number, default: null },
      potential: { type: Number, default: null },
      xp: { type: Number, default: 0 },
      xpToNext: { type: Number, default: 0 }
    }
  },

  titles: [String],
  achievements: [String],
  levelProgress: [LevelProgressSchema]

}, { timestamps: true });

module.exports = mongoose.model('PlayerStats', PlayerStatsSchema);
