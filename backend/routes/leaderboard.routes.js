import { Router } from "express";
import { getLeaderboard } from "../controllers/leaderboard.controllers.js";

const leaderboardRouter = Router()

leaderboardRouter.get("/all", getLeaderboard);

export default leaderboardRouter