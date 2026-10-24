import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/user.model.js";
import { Organization } from "./models/organization.model.js";
import { Problem } from "./models/problem.model.js";
import { Test } from "./models/test.model.js";
import { TestAttempt } from "./models/testAttempt.model.js";

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGODB_URL missing in environment");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected!");

    // Clean existing seed data
    console.log("Clearing previous demo records...");
    await Promise.all([
      User.deleteMany({ emailId: { $in: ["admin@codecaliber.edu", "evaluator@codecaliber.edu", "participant1@codecaliber.edu", "participant2@codecaliber.edu"] } }),
      Organization.deleteMany({ name: { $in: ["Apex Technologies", "Apex Institute of Technology"] } }),
      Problem.deleteMany({ title: { $in: ["Two Sum", "Reverse String", "Valid Palindrome"] } }),
      Test.deleteMany({ title: { $in: ["Midterm Practical Examination", "Weekly Algorithm Lab #4"] } }),
    ]);

    const hashedPassword = await bcrypt.hash("CodeCaliber@1234", 10);

    console.log("Creating demo users...");
    const adminUser = await User.create({
      firstName: "Dr. Eleanor",
      lastName: "Vance",
      emailId: "admin@codecaliber.edu",
      role: "admin",
      password: hashedPassword,
    });

    const evaluatorUser = await User.create({
      firstName: "Marcus",
      lastName: "Chen",
      emailId: "evaluator@codecaliber.edu",
      role: "evaluator",
      password: hashedPassword,
    });

    const participant1 = await User.create({
      firstName: "Aria",
      lastName: "Patel",
      emailId: "participant1@codecaliber.edu",
      role: "participant",
      password: hashedPassword,
    });

    const participant2 = await User.create({
      firstName: "Liam",
      lastName: "O'Connor",
      emailId: "participant2@codecaliber.edu",
      role: "participant",
      password: hashedPassword,
    });

    console.log("Creating organization...");
    const organization = await Organization.create({
      name: "Apex Technologies",
      code: "APEX-2026",
      createdBy: adminUser._id,
    });

    adminUser.organization = organization._id;
    await adminUser.save();
    evaluatorUser.organization = organization._id;
    await evaluatorUser.save();

    console.log("Creating practice problems...");
    const prob1 = await Problem.create({
      title: "Two Sum",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
      difficultyLevel: "easy",
      tags: "array",
      createdBy: evaluatorUser._id,
      visibleTestCases: [
        { input: "2 7 11 15\n9", output: "0 1", explanation: "nums[0] + nums[1] == 9" },
      ],
      hiddenTestCases: [
        { input: "3 2 4\n6", output: "1 2" },
        { input: "3 3\n6", output: "0 1" },
      ],
    });

    const prob2 = await Problem.create({
      title: "Valid Palindrome",
      description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string s, return true if it is a palindrome, or false otherwise.",
      difficultyLevel: "easy",
      tags: "string",
      createdBy: evaluatorUser._id,
      visibleTestCases: [
        { input: "A man, a plan, a canal: Panama", output: "true", explanation: "\"amanaplanacanalpanama\" is a palindrome." },
      ],
      hiddenTestCases: [
        { input: "race a car", output: "false" },
        { input: " ", output: "true" },
      ],
    });

    console.log("Creating assessments...");
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const earlierDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const midtermTest = await Test.create({
      title: "Midterm Practical Examination",
      instructions: "No outside tabs permitted. Fullscreen lock is strictly monitored.",
      testCode: "TEST-MIDT",
      questions: [prob1._id, prob2._id],
      questionMarks: [
        { question: prob1._id, marks: 50 },
        { question: prob2._id, marks: 50 },
      ],
      totalMarks: 100,
      durationMinutes: 45,
      startsAt: earlierDate,
      endsAt: pastDate,
      strictFullscreen: true,
      published: true,
      createdBy: evaluatorUser._id,
    });

    // Active test (for Your Assessments)
    const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const activeTest = await Test.create({
      title: "Weekly Algorithm Lab #4",
      instructions: "Solve the allocated array and string problems within the designated window.",
      testCode: "TEST-LAB4",
      questions: [prob1._id],
      questionMarks: [{ question: prob1._id, marks: 50 }],
      totalMarks: 50,
      durationMinutes: 30,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: futureDate,
      strictFullscreen: true,
      published: true,
      createdBy: evaluatorUser._id,
    });

    console.log("Creating participant attempts...");
    await TestAttempt.create({
      test: midtermTest._id,
      participant: participant1._id,
      student: participant1._id,
      startedAt: earlierDate,
      submittedAt: new Date(earlierDate.getTime() + 35 * 60 * 1000),
      status: "submitted",
      score: 100,
      total: 100,
      tabSwitches: 0,
      fullscreenExits: 0,
      integrityStatus: "clean",
      answers: [
        { question: prob1._id, earnedMarks: 50, maxMarks: 50, testCasesPassed: 2, testCasesTotal: 2, code: "// Solution Two Sum", language: "javascript" },
        { question: prob2._id, earnedMarks: 50, maxMarks: 50, testCasesPassed: 2, testCasesTotal: 2, code: "// Solution Palindrome", language: "javascript" },
      ],
    });

    await TestAttempt.create({
      test: midtermTest._id,
      participant: participant2._id,
      student: participant2._id,
      startedAt: earlierDate,
      submittedAt: new Date(earlierDate.getTime() + 40 * 60 * 1000),
      status: "submitted",
      score: 50,
      total: 100,
      tabSwitches: 2,
      fullscreenExits: 1,
      integrityStatus: "suspicious",
      answers: [
        { question: prob1._id, earnedMarks: 50, maxMarks: 50, testCasesPassed: 2, testCasesTotal: 2, code: "// Solution Two Sum", language: "javascript" },
        { question: prob2._id, earnedMarks: 0, maxMarks: 50, testCasesPassed: 0, testCasesTotal: 2, code: "", language: "javascript" },
      ],
    });

    console.log(`
=============================================================
  CODECALIBER DEMO DATABASE SEEDED SUCCESSFULLY!
=============================================================

Demo Accounts (Password for all: CodeCaliber@1234):

1. Admin (Organization / Contest Owner):
   Email: admin@codecaliber.edu
   Role:  admin

2. Evaluator (Interviewer / Host):
   Email: evaluator@codecaliber.edu
   Role:  evaluator

3. Participants (Candidates / Competitors):
   Email: participant1@codecaliber.edu
   Email: participant2@codecaliber.edu
   Role:  participant
=============================================================
`);

    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seedDatabase();
