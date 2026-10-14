import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { Problem } from "../models/problem.model.js";
import { ensureCppHeader } from "../utils/problem.utility.js";

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB...");

        const problems = await Problem.find({});
        console.log(`Found ${problems.length} problems to inspect.`);

        let updatedCount = 0;
        for (const prob of problems) {
            let modified = false;

            if (Array.isArray(prob.startCode)) {
                for (const s of prob.startCode) {
                    if (s.language?.toLowerCase() === "c++" || s.language?.toLowerCase() === "cpp") {
                        const original = s.initialCode;
                        const updated = ensureCppHeader(original);
                        if (original !== updated) {
                            s.initialCode = updated;
                            modified = true;
                        }
                    }
                }
            }

            if (Array.isArray(prob.referenceSolution)) {
                for (const r of prob.referenceSolution) {
                    if (r.language?.toLowerCase() === "c++" || r.language?.toLowerCase() === "cpp") {
                        const original = r.completeCode;
                        const updated = ensureCppHeader(original);
                        if (original !== updated) {
                            r.completeCode = updated;
                            modified = true;
                        }
                    }
                }
            }

            if (modified) {
                await prob.save();
                console.log(`Updated problem: "${prob.title}"`);
                updatedCount++;
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} problems.`);
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

migrate();
