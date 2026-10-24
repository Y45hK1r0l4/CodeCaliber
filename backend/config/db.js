import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URL or MONGO_URI environment variable is missing.");
    }
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");

    // Clean up any stale legacy index that may break test attempts
    try {
      const testAttemptsColl = mongoose.connection.collection("testattempts");
      const indexes = await testAttemptsColl.indexes();
      const hasOldIndex = indexes.some((idx) => idx.name === "test_1_student_1");
      if (hasOldIndex) {
        await testAttemptsColl.dropIndex("test_1_student_1");
        console.log("Dropped stale legacy index 'test_1_student_1'");
      }
    } catch {
      // Ignore if index doesn't exist or collection hasn't been created yet
    }
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};
