import mongoose, { Schema } from "mongoose";

const organizationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const Organization = mongoose.model("Organization", organizationSchema);
