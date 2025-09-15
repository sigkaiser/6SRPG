const mongoose = require('mongoose');
const { Schema } = mongoose;

const normalizeAliasName = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ExerciseAliasSchema = new Schema(
  {
    originalName: { type: String, required: true },
    normalizedOriginalName: {
      type: String,
      required: true,
      index: true,
      default: function () {
        return normalizeAliasName(this.originalName);
      },
    },
    matchedName: { type: String, required: true },
    matchedNameLower: {
      type: String,
      index: true,
      default: function () {
        return this.matchedName ? this.matchedName.toLowerCase() : undefined;
      },
    },
    confidenceScore: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

ExerciseAliasSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('ExerciseAlias', ExerciseAliasSchema);
