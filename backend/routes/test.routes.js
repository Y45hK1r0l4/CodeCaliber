import { Router } from "express";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import {
  createTest,
  getTestPreview,
  joinTestByCode,
  listAllTests,
  recordIntegrityViolation,
  saveTestAnswer,
  startTest,
  submitTest,
  testPerformance,
  closeTest,
  getAssessmentHistory,
} from "../controllers/test.controllers.js";

const testRouter = Router();

testRouter.get("/", userMiddleware, listAllTests);
testRouter.get("/history", adminMiddleware, getAssessmentHistory);
testRouter.post("/", adminMiddleware, createTest);
testRouter.patch("/:testId/close", adminMiddleware, closeTest);
testRouter.post("/join", userMiddleware, joinTestByCode);
testRouter.get("/:testId/preview", userMiddleware, getTestPreview);
testRouter.post("/:testId/start", userMiddleware, startTest);
testRouter.post("/attempts/:attemptId/integrity", userMiddleware, recordIntegrityViolation);
testRouter.patch("/attempts/:attemptId/answers", userMiddleware, saveTestAnswer);
testRouter.post("/attempts/:attemptId/submit", userMiddleware, submitTest);
testRouter.get("/:testId/performance", adminMiddleware, testPerformance);

export default testRouter;
