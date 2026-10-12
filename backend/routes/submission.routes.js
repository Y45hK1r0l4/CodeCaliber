import { Router } from "express";
import { userMiddleware } from "../middleware/user.middleware.js";
import { runCode, submitCode } from "../controllers/submission.controllers.js";

const submitRouter = Router()

submitRouter.post("/submit/:id",userMiddleware, submitCode)
submitRouter.post("/run/:id",userMiddleware,runCode)

export default submitRouter  