import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Organization } from "../models/organization.model.js";
import { TestAttempt } from "../models/testAttempt.model.js";

async function runMigration() {
  const mongoUri = process.env.MONGODB_URL || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URL is missing in environment variables (.env)");
    process.exit(1);
  }

  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected successfully!");

    const db = mongoose.connection.db;

    console.log("\n📦 1. Migrating legacy institutions collection to organizations...");
    const collections = await db.listCollections().toArray();
    const hasInstitutions = collections.some((c) => c.name === "institutions");

    let orgCount = 0;
    if (hasInstitutions) {
      const institutions = await db.collection("institutions").find({}).toArray();
      console.log(`Found ${institutions.length} legacy institution(s) in 'institutions' collection.`);
      
      for (const inst of institutions) {
        const existingOrg = await Organization.findById(inst._id);
        if (!existingOrg) {
          await Organization.create({
            _id: inst._id,
            name: inst.name || "Default Organization",
            code: inst.code || `ORG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            createdBy: inst.createdBy,
            createdAt: inst.createdAt || new Date(),
            updatedAt: inst.updatedAt || new Date(),
          });
          orgCount++;
        }
      }
      console.log(`✅ Migrated ${orgCount} record(s) into 'organizations' collection.`);
    } else {
      console.log("No legacy 'institutions' collection found, skipping collection copy.");
    }

    console.log("\n👥 2. Migrating legacy User roles ('super_admin', 'teacher', 'student')...");
    
    // We update using updateMany with direct MongoDB collection to bypass schema enum locks during migration
    const superAdminRes = await db.collection("users").updateMany(
      { role: { $in: ["super_admin", "admin"] } },
      { $set: { role: "admin" } }
    );
    console.log(`- Updated to 'admin': ${superAdminRes.modifiedCount} account(s)`);

    const teacherRes = await db.collection("users").updateMany(
      { role: "teacher" },
      { $set: { role: "evaluator" } }
    );
    console.log(`- Updated to 'evaluator': ${teacherRes.modifiedCount} account(s)`);

    const studentRes = await db.collection("users").updateMany(
      { role: { $in: ["student", "user"] } },
      { $set: { role: "participant" } }
    );
    console.log(`- Updated to 'participant': ${studentRes.modifiedCount} account(s)`);

    console.log("\n🏢 3. Backfilling user.organization references...");
    const organizations = await Organization.find({});
    let usersLinked = 0;

    for (const org of organizations) {
      // 1. Link creator (admin)
      if (org.createdBy) {
        const res = await db.collection("users").updateOne(
          { _id: org.createdBy, $or: [{ organization: null }, { organization: { $exists: false } }] },
          { $set: { organization: org._id } }
        );
        if (res.modifiedCount > 0) usersLinked++;
      }

      // 2. Link evaluators/teachers
      const memberIds = [...(org.evaluators || []), ...(org.teachers || [])];
      if (memberIds.length > 0) {
        const res = await db.collection("users").updateMany(
          { _id: { $in: memberIds }, $or: [{ organization: null }, { organization: { $exists: false } }] },
          { $set: { organization: org._id } }
        );
        usersLinked += res.modifiedCount;
      }
    }
    console.log(`✅ Linked organization foreign key for ${usersLinked} user(s).`);

    console.log("\n📝 4. Backfilling TestAttempts (ensuring 'participant' is populated)...");
    const attemptRes = await db.collection("testattempts").updateMany(
      { student: { $exists: true }, $or: [{ participant: null }, { participant: { $exists: false } }] },
      [{ $set: { participant: "$student" } }]
    );
    console.log(`✅ Synchronized participant field on ${attemptRes.modifiedCount || 0} TestAttempt(s).`);

    console.log("\n=============================================================");
    console.log("🎉 ALL LEGACY MONGODB DOCUMENTS MIGRATED SUCCESSFULLY!");
    console.log("=============================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

runMigration();
