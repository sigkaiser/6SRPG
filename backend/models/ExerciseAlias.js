const mongoose = require('mongoose');
const { Schema } = mongoose;

const ExerciseAliasSchema = new Schema({
  originalName: { type: String, required: true },
  matchedName: { type: String, required: true },
  confidenceScore: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExerciseAlias', ExerciseAliasSchema);
