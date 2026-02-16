const mongoose = require('mongoose');
const { Schema } = mongoose;

const SetSchema = new Schema({
  reps: { type: Number },
  weight: { type: Number },
  duration: { type: Number } // duration-like set value (seconds for time/holds/intervals)
}, { _id: false });

const ExerciseLogSchema = new Schema({
  date: { type: Date, default: Date.now },
  exerciseId: { type: String },
  type: String, // e.g., "Push-ups", "Barbell Squat"
  category: String,
  modality: String,
  doseType: String,
  sets: [SetSchema],
  duration: { type: Number }, // canonical duration-like value (seconds for time/holds/intervals)
  intensity: { type: Number }
});

const ExerciseHistorySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  history: [ExerciseLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('ExerciseHistory', ExerciseHistorySchema);
