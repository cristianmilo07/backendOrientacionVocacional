const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  question: { type: String, required: true },
  value: { type: String, required: true }
}, { _id: false });

const responseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  username: { type: String, required: true, trim: true, lowercase: true },
  answers: { type: [answerSchema], required: true },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SurveyResponse', responseSchema);
