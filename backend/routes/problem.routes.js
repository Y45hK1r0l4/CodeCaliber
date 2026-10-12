import { Router } from "express"
import {
    createProblem,
    updateProblem,
    deleteProblem,
    getAllProblem,
    getProblemById,
    getProblemByIdForAdmin,
    solvedAllProblemByUser,
    submittedProblem,
    generateAiProblem,
    getAiHint,
    getAiExplanation,
    getAiComplexity
} from "../controllers/problem.controllers.js"
import { adminMiddleware } from "../middleware/adminMiddleware.js"
import { userMiddleware } from "../middleware/user.middleware.js"


const problemRouter = Router()

//requires admin access 
problemRouter.post("/create",adminMiddleware,createProblem)
problemRouter.put("/update/:id",adminMiddleware,updateProblem)
problemRouter.delete("/delete/:id",adminMiddleware,deleteProblem)
problemRouter.get("/admin/getProblem/:id",adminMiddleware,getProblemByIdForAdmin)
problemRouter.post("/ai-generate",adminMiddleware,generateAiProblem)

//user can access
problemRouter.get("/ProblemById/:id",userMiddleware,getProblemById)  // to fetch individual problem
problemRouter.get("/getAllProblem",userMiddleware,getAllProblem)   // to fetch all problems
problemRouter.get("/problemSolvedByUser",userMiddleware,solvedAllProblemByUser)  // to get total no of solved problem by user
problemRouter.get("/submittedProblem/:pid",userMiddleware,submittedProblem)

// Student AI Copilot
problemRouter.post("/ai-hint",userMiddleware,getAiHint)
problemRouter.post("/ai-explain",userMiddleware,getAiExplanation)
problemRouter.post("/ai-complexity",userMiddleware,getAiComplexity)

export default problemRouter

