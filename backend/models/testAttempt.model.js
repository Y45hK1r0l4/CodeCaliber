import mongoose, { Schema } from "mongoose";

const testAttemptSchema = new Schema({
  test: { type: Schema.Types.ObjectId, ref: "Test", required: true },
  participant: { type: Schema.Types.ObjectId, ref: "User", required: true },
  startedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: ["unlocked", "in_progress", "submitted", "expired"], default: "unlocked" },
  answers: [{
    question: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    code: { type: String, default: "" },
    language: { type: String, default: "" },
    submission: { type: Schema.Types.ObjectId, ref: "Submission", default: null },
    testCasesPassed: { type: Number, default: 0 },
    testCasesTotal: { type: Number, default: 0 },
    earnedMarks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 10 },
  }],
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  tabSwitches: { type: Number, default: 0 },
  fullscreenExits: { type: Number, default: 0 },
  integrityStatus: { type: String, enum: ["clean", "suspicious", "flagged"], default: "clean" },
}, { timestamps: true });

testAttemptSchema.index({ test: 1, participant: 1 });

export const TestAttempt = mongoose.model("TestAttempt", testAttemptSchema);
