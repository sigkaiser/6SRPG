const mongoose = require('mongoose');
const { Schema } = mongoose;

// Main User Schema
// Authentication, Profile, Settings

const UserSchema = new Schema({
  // 1. Registration Data
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // bcrypt hash
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },

  // 2. Profile/Tracking
  lastLogin: Date,
  dailyLoginStreak: { type: Number, default: 0 },

  // 3. Settings/Preferences
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
