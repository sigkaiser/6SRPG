const mongoose = require('mongoose');
const { Schema } = mongoose;

const SetSchema = new Schema({
  reps: { type: Number },
  weight: { type: Number },
  duration: { type: Number } // in seconds for stretching
}, { _id: false });

const ExerciseLogSchema = new Schema({
  date: { type: Date, default: Date.now },
  type: String, // e.g., "Push-ups", "Barbell Squat"
  category: String, // "Lift", "Stretch", "Cardio"
  sets: [SetSchema],
  duration: { type: Number }, // in minutes for cardio
  intensity: { type: Number } // METs for cardio
});

const ExerciseHistorySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  history: [ExerciseLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('ExerciseHistory', ExerciseHistorySchema);
