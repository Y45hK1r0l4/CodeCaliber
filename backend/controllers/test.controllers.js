import crypto from "crypto";
import { Test } from "../models/test.model.js";
import { TestAttempt } from "../models/testAttempt.model.js";
import { Organization } from "../models/organization.model.js";
import { User } from "../models/user.model.js";
import { Problem } from "../models/problem.model.js";

// Generates a cryptographically strong, non-guessable test code (e.g., TEST-K7P9-X2M4)
const ALPHANUMERIC_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters (0, O, 1, I)

const generateRandomBlock = (length = 4) => {
  let result = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC_CHARS[randomBytes[i] % ALPHANUMERIC_CHARS.length];
  }
  return result;
};

const generateUniqueTestCode = async () => {
  let isUnique = false;
  let code = "";
  while (!isUnique) {
    // Format: TEST-XXXX-XXXX (e.g. TEST-8K3N-7W2P) with over 1 trillion combinations
    code = `TEST-${generateRandomBlock(4)}-${generateRandomBlock(4)}`;
    const existing = await Test.findOne({ testCode: code });
    if (!existing) isUnique = true;
  }
  return code;
};

export const checkAndAutoFinalizeAttempt = async (attempt, test = null) => {
  if (!attempt) return null;
  if (attempt.status !== "in_progress") return attempt;

  if (!test && attempt.test) {
    test = attempt.test._id ? attempt.test : await Test.findById(attempt.test);
  }
  if (!test) return attempt;

  const now = new Date();
  const durationMs = (test.durationMinutes || 60) * 60 * 1000;
  const isTimerExpired = new Date(attempt.startedAt.getTime() + durationMs) <= now;
  const isTestClosed = test.endsAt && new Date(test.endsAt) <= now;

  if (isTimerExpired || isTestClosed) {
    attempt.status = "submitted";
    attempt.submittedAt = attempt.submittedAt || now;

    const populated = await TestAttempt.findById(attempt._id).populate("answers.submission");
    let totalScore = 0;
    let totalMarks = 0;

    for (const ans of populated.answers || []) {
      const max = ans.maxMarks || 10;
      totalMarks += max;
      if (ans.submission) {
        const passed = ans.submission.testCasesPassed || 0;
        const total = (ans.submission.failedTestCase?.index ? Math.max(ans.submission.testCasesPassed + 1, 10) : (ans.submission.testCasesPassed || 10));
        const effectiveTotal = Math.max(passed, ans.testCasesTotal || 10);
        const earned = Math.round((passed / effectiveTotal) * max * 10) / 10;
        ans.earnedMarks = earned;
        ans.testCasesPassed = passed;
        ans.testCasesTotal = effectiveTotal;
        totalScore += earned;
      } else if (ans.earnedMarks) {
        totalScore += ans.earnedMarks;
      }
    }

    attempt.answers = populated.answers;
    attempt.score = Math.round(totalScore * 10) / 10;
    attempt.total = totalMarks || test.totalMarks || ((test.questions?.length || 1) * 10);
    await attempt.save();
  }

  return attempt;
};

export const createTest = async (req, res) => {
  try {
    if (!["admin", "evaluator"].includes(req.result.role)) {
      return res.status(403).json({ message: "Only evaluators and admins can create tests" });
    }
    const { 
      title, 
      instructions, 
      questions, 
      questionMarks, 
      durationMinutes, 
      startsAt, 
      endsAt, 
      published,
      assessmentType,
      enableAiHints,
      enableCustomInput,
      strictFullscreen
    } = req.body;

    if (!title || !Array.isArray(questions) || questions.length === 0 || !durationMinutes) {
      return res.status(400).json({ message: "Title, questions, and duration are required" });
    }

    const testCode = await generateUniqueTestCode();

    let marksConfig = [];
    if (Array.isArray(questionMarks) && questionMarks.length > 0) {
      marksConfig = questionMarks.map((item) => ({
        question: item.question,
        marks: Number(item.marks) > 0 ? Number(item.marks) : 10
      }));
    } else {
      marksConfig = questions.map((q) => ({ question: q, marks: 10 }));
    }
    const totalMarks = marksConfig.reduce((sum, item) => sum + item.marks, 0);

    const orgId = req.result.organization 
      || (await Organization.findOne({ createdBy: req.result._id }))?._id;

    const test = await Test.create({
      title,
      instructions: instructions || "",
      testCode,
      questions,
      questionMarks: marksConfig,
      totalMarks,
      durationMinutes: Number(durationMinutes),
      startsAt: startsAt && !isNaN(new Date(startsAt).getTime()) ? new Date(startsAt) : undefined,
      endsAt: endsAt && !isNaN(new Date(endsAt).getTime()) ? new Date(endsAt) : undefined,
      assessmentType: assessmentType === "simple" ? "simple" : "coding",
      enableAiHints: Boolean(enableAiHints),
      enableCustomInput: enableCustomInput ?? true,
      strictFullscreen: strictFullscreen ?? true,
      published: published ?? true,
      createdBy: req.result._id,
      organization: orgId || null
    });

    res.status(201).json({ test });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const closeTest = async (req, res) => {
  try {
    if (!["admin", "evaluator"].includes(req.result.role)) {
      return res.status(403).json({ message: "Only evaluators and admins can close tests" });
    }
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ message: "Test not found" });
    test.endsAt = new Date();
    await test.save();
    res.json({ message: "Assessment closed and moved to history", test });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listAllTests = async (req, res) => {
  try {
    if (!req.result) return res.status(401).json({ message: "Authentication required" });
    const isStaff = ["admin", "evaluator"].includes(req.result.role);

    let tests;
    let attemptsMap = new Map();

    if (isStaff) {
      const orgId = req.result.organization 
        || (await Organization.findOne({ createdBy: req.result._id }))?._id;

      if (!orgId) {
        return res.status(400).json({ message: "You must belong to an organization to view assessments" });
      }

      tests = await Test.find({ organization: orgId })
        .populate("questions", "title difficultyLevel tags")
        .populate("createdBy", "firstName lastName emailId role")
        .sort({ createdAt: -1 });

      // Load staff's personal attempts if they tested their own assessment
      const staffAttempts = await TestAttempt.find({ participant: req.result._id });
      staffAttempts.forEach((att) => attemptsMap.set(String(att.test), att));
    } else {
      // For participants: Only show tests they have unlocked or attempted via Test Code
      const attempts = await TestAttempt.find({ participant: req.result._id });
      attempts.forEach((att) => attemptsMap.set(String(att.test), att));

      const accessibleTestIds = Array.from(attemptsMap.keys());

      tests = await Test.find({
        _id: { $in: accessibleTestIds },
        published: true,
      })
        .populate("questions", "title difficultyLevel tags")
        .populate("createdBy", "firstName lastName emailId role")
        .sort({ startsAt: 1, createdAt: -1 });
    }

    // Backfill any tests missing testCode or totalMarks
    for (const t of tests) {
      let changed = false;
      if (!t.testCode) {
        t.testCode = await generateUniqueTestCode();
        changed = true;
      }
      if (!t.totalMarks || t.totalMarks === 0) {
        t.totalMarks = (t.questions?.length || 1) * 10;
        changed = true;
      }
      if (changed) await t.save();
    }

    const testList = tests.map((t) => {
      const att = attemptsMap.get(String(t._id));
      let attemptData = null;
      if (att) {
        const questionsSolved = (att.answers || []).filter(
          (ans) => (ans.earnedMarks > 0 && ans.earnedMarks >= (ans.maxMarks || 10)) ||
                   (ans.testCasesPassed > 0 && ans.testCasesPassed === ans.testCasesTotal)
        ).length;

        attemptData = {
          status: att.status,
          integrityStatus: att.integrityStatus,
          submittedAt: att.submittedAt,
          questionsSolved,
          totalQuestions: t.questions?.length || att.answers?.length || 0,
        };

        if (isStaff) {
          attemptData.score = att.score;
          attemptData.total = att.total;
        }
      }

      return {
        _id: t._id,
        title: t.title,
        instructions: t.instructions,
        testCode: t.testCode,
        durationMinutes: t.durationMinutes,
        totalMarks: isStaff ? (t.totalMarks || (t.questions.length * 10)) : undefined,
        questionMarks: isStaff ? t.questionMarks : undefined,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        published: t.published,
        questions: t.questions,
        createdAt: t.createdAt,
        createdBy: t.createdBy
          ? {
              _id: t.createdBy._id,
              firstName: t.createdBy.firstName,
              lastName: t.createdBy.lastName,
              emailId: t.createdBy.emailId,
              role: t.createdBy.role,
            }
          : null,
        attempt: attemptData,
      };
    });

    res.json({ tests: testList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const joinTestByCode = async (req, res) => {
  try {
    if (!req.result) return res.status(401).json({ message: "Authentication required" });
    if (["admin", "evaluator"].includes(req.result.role)) {
      return res.status(403).json({ message: "Administrators and evaluators cannot take assessments as candidates." });
    }
    const rawCode = String(req.body.testCode || "").trim().toUpperCase();
    if (!rawCode) return res.status(400).json({ message: "Please provide a valid Test Code" });

    const formattedCode = rawCode.startsWith("TEST-") ? rawCode : `TEST-${rawCode}`;

    const test = await Test.findOne({
      $or: [{ testCode: rawCode }, { testCode: formattedCode }],
      published: true
    });

    if (!test) {
      return res.status(404).json({ message: "No active assessment found with this Test Code" });
    }

    // Create or find the attempt with status "unlocked" (timer has NOT started)
    let attempt = await TestAttempt.findOne({ test: test._id, participant: req.result._id });
    if (!attempt) {
      const marksConfig = test.questionMarks || [];
      const totalMarks = test.totalMarks || ((test.questions?.length || 1) * 10);
      attempt = await TestAttempt.create({
        test: test._id,
        participant: req.result._id,
        status: "unlocked",
        startedAt: null,
        total: totalMarks,
        answers: (test.questions || []).map((question) => {
          const qId = question._id || question;
          const markItem = marksConfig.find((qm) => String(qm.question) === String(qId));
          const maxMarks = markItem ? markItem.marks : 10;
          return {
            question: qId,
            maxMarks,
            earnedMarks: 0,
            testCasesPassed: 0,
            testCasesTotal: 0
          };
        }),
      });
    }

    res.json({
      testId: test._id,
      title: test.title,
      testCode: test.testCode,
      message: `Assessment "${test.title}" added to your assessments list!`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTestPreview = async (req, res) => {
  try {
    if(!req.result) return res.status(401).json({ message: "Authentication required" });
    const isStaff = ["admin", "evaluator"].includes(req.result.role);
    const test = await Test.findById(req.params.testId).populate("createdBy", "firstName lastName emailId role");
    if(!test) return res.status(404).json({ message: "Test not found" });
    if(!isStaff && !test.published) return res.status(404).json({ message: "Test not found" });

    // Candidates have personal test attempts; staff do not take tests
    let attemptResponse = null;
    if(!isStaff) {
      let attempt = await TestAttempt.findOne({ test: test._id, participant: req.result._id });
      if(attempt && attempt.status === "in_progress") {
        attempt = await checkAndAutoFinalizeAttempt(attempt, test);
      }

      if(attempt) {
        const questionsSolved = (attempt.answers || []).filter(
          (ans) => (ans.earnedMarks > 0 && ans.earnedMarks >= (ans.maxMarks || 10)) ||
                   (ans.testCasesPassed > 0 && ans.testCasesPassed === ans.testCasesTotal)
        ).length;

        attemptResponse = {
          _id: attempt._id,
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          questionsSolved,
          totalQuestions: test.questions?.length || attempt.answers?.length || 0,
          tabSwitches: attempt.tabSwitches || 0,
          fullscreenExits: attempt.fullscreenExits || 0,
          integrityStatus: attempt.integrityStatus || "clean",
          expiresAt: attempt.startedAt
            ? new Date(attempt.startedAt.getTime() + (test.durationMinutes || 60) * 60 * 1000)
            : null,
        };
      }
    }

    res.json({
      test: {
        _id: test._id,
        title: test.title,
        instructions: test.instructions,
        testCode: test.testCode,
        durationMinutes: test.durationMinutes,
        startsAt: test.startsAt,
        endsAt: test.endsAt,
        published: test.published,
        assessmentType: test.assessmentType || "coding",
        enableAiHints: Boolean(test.enableAiHints),
        enableCustomInput: test.enableCustomInput ?? true,
        strictFullscreen: test.strictFullscreen ?? true,
        questionCount: test.questions.length,
        createdBy: test.createdBy
          ? {
              _id: test.createdBy._id,
              firstName: test.createdBy.firstName,
              lastName: test.createdBy.lastName,
              emailId: test.createdBy.emailId,
              role: test.createdBy.role,
            }
          : null,
      },
      existingAttempt: attemptResponse,
      isStaff,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const recordIntegrityViolation = async (req, res) => {
  try {
    if(!req.result) return res.status(401).json({ message: "Authentication required" });
    const { type } = req.body;
    const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, participant: req.result._id });
    if(!attempt || attempt.status !== "in_progress") {
      return res.status(404).json({ message: "Active test attempt not found" });
    }

    if(type === "tab_switch") {
      attempt.tabSwitches = (attempt.tabSwitches || 0) + 1;
    }else if(type === "fullscreen_exit") {
      attempt.fullscreenExits = (attempt.fullscreenExits || 0) + 1;
    }

    const totalViolations = (attempt.tabSwitches || 0) + (attempt.fullscreenExits || 0);
    if (totalViolations >= 3) {
      attempt.integrityStatus = "flagged";
    } else if (totalViolations >= 2) {
      attempt.integrityStatus = "suspicious";
    } else {
      attempt.integrityStatus = "clean";
    }

    await attempt.save();
    res.json({
      tabSwitches: attempt.tabSwitches,
      fullscreenExits: attempt.fullscreenExits,
      integrityStatus: attempt.integrityStatus,
      message: "Integrity violation recorded",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const startTest = async (req, res) => {
  try {
    if(!req.result) return res.status(401).json({ message: "Authentication required" });
    const isStaff = ["admin", "evaluator"].includes(req.result.role);
    if(isStaff) {
      return res.status(403).json({ message: "Administrators and evaluators cannot take assessments as candidates." });
    }
    const testFilter = { _id: req.params.testId, published: true };
    const test = await Test.findOne(testFilter).populate("questions", "title description difficultyLevel tags startCode visibleTestCases");
    if(!test) return res.status(404).json({ message: "Test not found" });

    const now = new Date();
    if(test.startsAt && now < test.startsAt) return res.status(409).json({ message: "This test has not started yet" });
    if(test.endsAt && now > test.endsAt) return res.status(409).json({ message: "This test is closed" });

    let attempt = await TestAttempt.findOne({ test: test._id, participant: req.result._id });
    if(attempt) {
      if(attempt.status === "in_progress") {
        attempt = await checkAndAutoFinalizeAttempt(attempt, test);
      }
      if(attempt.status === "submitted" || attempt.status === "expired") {
        const questionsSolved = (attempt.answers || []).filter(
          (ans) => (ans.earnedMarks > 0 && ans.earnedMarks >= (ans.maxMarks || 10)) ||
                   (ans.testCasesPassed > 0 && ans.testCasesPassed === ans.testCasesTotal)
        ).length;
        let sanitizedAttempt = attempt.toObject();
        sanitizedAttempt.questionsSolved = questionsSolved;
        sanitizedAttempt.totalQuestions = test.questions?.length || attempt.answers?.length || 0;
        delete sanitizedAttempt.score;
        delete sanitizedAttempt.total;
        sanitizedAttempt.answers = (sanitizedAttempt.answers || []).map((ans) => {
          const { earnedMarks, maxMarks, ...rest } = ans;
          return rest;
        });
        return res.json({
          test,
          attempt: sanitizedAttempt,
          completed: true,
          autoSubmitted: true,
          message: "Assessment time has ended or test has been submitted.",
        });
      }
    }

    if(!attempt) {
      const marksConfig = test.questionMarks || [];
      const totalMarks = test.totalMarks || (test.questions.length * 10);
      attempt = await TestAttempt.create({
        test: test._id,
        participant: req.result._id,
        total: totalMarks,
        status: "in_progress",
        startedAt: new Date(),
        answers: test.questions.map((question) => {
          const qId = question._id || question;
          const markItem = marksConfig.find((qm) => String(qm.question) === String(qId));
          const maxMarks = markItem ? markItem.marks : 10;
          return {
            question: qId,
            maxMarks,
            earnedMarks: 0,
            testCasesPassed: 0,
            testCasesTotal: 0
          };
        }),
      });
    } else if (attempt.status === "unlocked") {
      // First time user actually begins the test after accepting rules in fullscreen
      attempt.status = "in_progress";
      attempt.startedAt = new Date();
      await attempt.save();
    }

    const currentTime = new Date();
    const startTime = attempt.startedAt ? new Date(attempt.startedAt).getTime() : currentTime.getTime();
    const expiresAt = new Date(startTime + test.durationMinutes * 60 * 1000);
    if (currentTime >= expiresAt || (test.endsAt && currentTime >= new Date(test.endsAt))) {
      attempt = await checkAndAutoFinalizeAttempt(attempt, test);
      const questionsSolved = (attempt.answers || []).filter(
        (ans) => (ans.earnedMarks > 0 && ans.earnedMarks >= (ans.maxMarks || 10)) ||
                 (ans.testCasesPassed > 0 && ans.testCasesPassed === ans.testCasesTotal)
      ).length;
      let sanitizedAttempt = attempt.toObject();
      sanitizedAttempt.questionsSolved = questionsSolved;
      sanitizedAttempt.totalQuestions = test.questions?.length || attempt.answers?.length || 0;
      delete sanitizedAttempt.score;
      delete sanitizedAttempt.total;
      sanitizedAttempt.answers = (sanitizedAttempt.answers || []).map((ans) => {
        const { earnedMarks, maxMarks, ...rest } = ans;
        return rest;
      });
      return res.json({
        test,
        attempt: sanitizedAttempt,
        completed: true,
        autoSubmitted: true,
        message: "Your assessment time has expired and has been automatically submitted.",
      });
    }
    res.json({ test, attempt, expiresAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveTestAnswer = async (req, res) => {
  try {
    if (!req.result) return res.status(401).json({ message: "Authentication required" });
    let attempt = await TestAttempt.findOne({ _id: req.params.attemptId, participant: req.result._id }).populate("test");
    if (!attempt) return res.status(404).json({ message: "Active attempt not found" });

    // Check if test time or window expired
    const expiresAt = new Date(attempt.startedAt.getTime() + attempt.test.durationMinutes * 60 * 1000);
    const now = new Date();
    if (now >= expiresAt || (attempt.test.endsAt && now >= new Date(attempt.test.endsAt))) {
      attempt = await checkAndAutoFinalizeAttempt(attempt, attempt.test);
      return res.status(409).json({ message: "The test timer has expired. Your test has been automatically submitted.", attempt });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Assessment is already submitted" });
    }

    const answer = attempt.answers.find((item) => String(item.question) === String(req.body.question));
    if (!answer) return res.status(400).json({ message: "Question is not part of this test" });
    answer.code = req.body.code ?? "";
    answer.language = req.body.language ?? "";
    await attempt.save();
    res.json({ answer, message: "Draft saved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitTest = async (req, res) => {
  try {
    if (!req.result) return res.status(401).json({ message: "Authentication required" });
    const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, participant: req.result._id }).populate("test");
    if (!attempt) return res.status(404).json({ message: "Active attempt not found" });

    // If latest question code was supplied in the request body, save it before finalizing
    if (req.body.currentQuestion && req.body.currentCode !== undefined) {
      const currentAns = attempt.answers.find((item) => String(item.question) === String(req.body.currentQuestion));
      if (currentAns) {
        currentAns.code = req.body.currentCode;
        if (req.body.language) currentAns.language = req.body.language;
      }
    }

    attempt.status = "submitted";
    attempt.submittedAt = attempt.submittedAt || new Date();

    const populated = await TestAttempt.findById(attempt._id).populate("answers.submission");
    let totalScore = 0;
    let totalMarks = 0;

    for (const ans of populated.answers || []) {
      const max = ans.maxMarks || 10;
      totalMarks += max;
      if (ans.submission) {
        const passed = ans.submission.testCasesPassed || 0;
        const total = (ans.submission.failedTestCase?.index ? Math.max(ans.submission.testCasesPassed + 1, 10) : (ans.submission.testCasesPassed || 10));
        const effectiveTotal = Math.max(passed, ans.testCasesTotal || 10);
        const earned = Math.round((passed / effectiveTotal) * max * 10) / 10;
        ans.earnedMarks = earned;
        ans.testCasesPassed = passed;
        ans.testCasesTotal = effectiveTotal;
        totalScore += earned;
      } else if (ans.earnedMarks) {
        totalScore += ans.earnedMarks;
      }
    }

    attempt.answers = populated.answers;
    attempt.score = Math.round(totalScore * 10) / 10;
    attempt.total = totalMarks || attempt.test.totalMarks || (attempt.test.questions?.length || 1) * 10;
    await attempt.save();

    const questionsSolved = (attempt.answers || []).filter(
      (ans) => (ans.earnedMarks > 0 && ans.earnedMarks >= (ans.maxMarks || 10)) ||
               (ans.testCasesPassed > 0 && ans.testCasesPassed === ans.testCasesTotal)
    ).length;

    let responseAttempt = attempt.toObject();
    responseAttempt.questionsSolved = questionsSolved;
    responseAttempt.totalQuestions = attempt.answers?.length || 0;

    delete responseAttempt.score;
    delete responseAttempt.total;
    responseAttempt.answers = (responseAttempt.answers || []).map((ans) => {
      const { earnedMarks, maxMarks, ...rest } = ans;
      return rest;
    });

    res.json({ attempt: responseAttempt, message: "Assessment submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const testPerformance = async (req, res) => {
  try {
    const isStaff = ["admin", "evaluator"].includes(req.result.role);
    if (!isStaff) {
      return res.status(403).json({ message: "Only staff can view assessment performance" });
    }

    const test = await Test.findById(req.params.testId)
      .populate("questions", "title difficultyLevel")
      .populate("createdBy", "firstName lastName emailId role");

    if (!test) return res.status(404).json({ message: "Test not found" });

    if (!test.testCode) {
      test.testCode = await generateUniqueTestCode();
      await test.save();
    }

    // Auto-finalize any in_progress attempts that exceeded test timer or test window
    const inProgress = await TestAttempt.find({ test: test._id, status: "in_progress" });
    for (const att of inProgress) {
      await checkAndAutoFinalizeAttempt(att, test);
    }

    const attempts = await TestAttempt.find({ test: test._id })
      .populate("participant", "firstName lastName emailId role")
      .populate("answers.question", "title difficultyLevel")
      .populate("answers.submission", "status testCasesPassed");

    const performance = attempts.map((att) => ({
      participant: att.participant,
      student: att.participant,
      attempt: att,
      status: att.status || "not_started",
      score: att.score || 0,
      total: att.total || test.totalMarks || (test.questions.length * 10),
      tabSwitches: att.tabSwitches || 0,
      fullscreenExits: att.fullscreenExits || 0,
      integrityStatus: att.integrityStatus || "clean",
      startedAt: att.startedAt,
      submittedAt: att.submittedAt,
      questionBreakdown: (att.answers || []).map((ans) => ({
        questionId: ans.question?._id || ans.question,
        title: ans.question?.title || "Problem",
        testCasesPassed: ans.testCasesPassed || 0,
        testCasesTotal: ans.testCasesTotal || 0,
        earnedMarks: ans.earnedMarks || 0,
        maxMarks: ans.maxMarks || 10,
        status: ans.submission?.status || "unattempted",
      })),
    })).sort((a, b) => b.score - a.score);

    res.json({ test, performance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssessmentHistory = async (req, res) => {
  try {
    if (!req.result) return res.status(401).json({ message: "Authentication required" });
    const isStaff = ["admin", "evaluator"].includes(req.result.role);
    if (!isStaff) {
      return res.status(403).json({ message: "Only evaluators or administrators can view assessment history" });
    }
    const orgId = req.result.organization 
      || (await Organization.findOne({ createdBy: req.result._id }))?._id;

    if (!orgId) {
      return res.status(400).json({ message: "You must belong to an organization to view assessment history" });
    }

    const now = new Date();

    // STRICT: Only concluded/closed assessments belonging to their organization!
    const query = {
      organization: orgId,
      endsAt: { $lte: now }
    };

    const tests = await Test.find(query)
      .populate("questions", "title difficultyLevel")
      .populate("createdBy", "firstName lastName emailId role")
      .sort({ endsAt: -1, createdAt: -1 });

    const testIds = tests.map((t) => t._id);

    // Auto-finalize any in_progress attempts belonging to concluded tests
    const orphanedAttempts = await TestAttempt.find({ test: { $in: testIds }, status: "in_progress" });
    for (const att of orphanedAttempts) {
      const t = tests.find((item) => String(item._id) === String(att.test));
      await checkAndAutoFinalizeAttempt(att, t);
    }

    const stats = await TestAttempt.aggregate([
      { $match: { test: { $in: testIds } } },
      {
        $group: {
          _id: "$test",
          totalCandidates: { $sum: 1 },
          completedCandidates: {
            $sum: {
              $cond: [{ $in: ["$status", ["submitted", "expired"]] }, 1, 0],
            },
          },
          avgScore: { $avg: "$score" },
          highestScore: { $max: "$score" },
          flaggedCandidates: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: ["$tabSwitches", 0] },
                    { $gt: ["$fullscreenExits", 0] },
                    { $ne: ["$integrityStatus", "clean"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = new Map();
    stats.forEach((s) => statsMap.set(String(s._id), s));

    const history = tests.map((t) => {
      const s = statsMap.get(String(t._id)) || {};
      const totalMarks = t.totalMarks || (t.questions?.length || 1) * 10;
      return {
        _id: t._id,
        title: t.title,
        testCode: t.testCode,
        durationMinutes: t.durationMinutes,
        totalMarks,
        questionsCount: t.questions?.length || 0,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        createdAt: t.createdAt,
        isClosed: true,
        status: "closed",
        createdBy: t.createdBy ? {
          _id: t.createdBy._id,
          firstName: t.createdBy.firstName,
          lastName: t.createdBy.lastName,
          emailId: t.createdBy.emailId,
          role: t.createdBy.role,
        } : null,
        totalCandidates: s.totalCandidates || 0,
        completedCandidates: s.completedCandidates || 0,
        avgScore: s.avgScore !== undefined ? Math.round(s.avgScore * 10) / 10 : 0,
        highestScore: s.highestScore !== undefined ? s.highestScore : 0,
        flaggedCandidates: s.flaggedCandidates || 0,
      };
    });

    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
