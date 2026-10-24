import mongoose, { Schema } from "mongoose";

const testSchema = new Schema({
  title: { type: String, required: true, trim: true },
  instructions: { type: String, default: "" },
  testCode: { type: String, uppercase: true, trim: true, index: true },
  questions: [{ type: Schema.Types.ObjectId, ref: "Problem", required: true }],
  questionMarks: [{
    question: { type: Schema.Types.ObjectId, ref: "Problem" },
    marks: { type: Number, default: 10, min: 1 }
  }],
  totalMarks: { type: Number, default: 0 },
  durationMinutes: { type: Number, required: true, min: 1, max: 480 },
  startsAt: { type: Date },
  endsAt: { type: Date },
  assessmentType: { type: String, enum: ["coding", "simple"], default: "coding" },
  enableAiHints: { type: Boolean, default: false },
  enableCustomInput: { type: Boolean, default: true },
  strictFullscreen: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
  published: { type: Boolean, default: false },
}, { timestamps: true });

export const Test = mongoose.model("Test", testSchema);
