import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/userAuth.routes.js";
import { redisClient } from "./config/redis.js";
import problemRouter from "./routes/problem.routes.js";
import cors from "cors";
import submitRouter from "./routes/submission.routes.js";
import testRouter from "./routes/test.routes.js";
import { getAllProblem } from "./controllers/problem.controllers.js";
import { adminMiddleware } from "./middleware/adminMiddleware.js";

const app = express();

// Trust reverse proxy (Render, AWS, Heroku) so secure cross-site cookies work
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration for local development + live Vercel deployments
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

const port = process.env.PORT || 8000;

// Routes
app.use("/user", authRouter);
app.use("/problem", problemRouter);
app.use("/submission", submitRouter);
app.use("/tests", testRouter);

// Tenant-isolated question bank for staff
app.get("/admin/problems", adminMiddleware, getAllProblem);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "codeCaliber API is running successfully",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

const initializeConnection = async () => {
  try {
    await connectDB();

    // Connect to Redis if configured, but don't crash the server if unavailable
    if (process.env.REDIS_HOST) {
      try {
        await redisClient.connect();
        console.log("Redis connected successfully");
      } catch (redisErr) {
        console.warn("Redis connection failed, continuing without token blacklist cache:", redisErr.message);
      }
    } else {
      console.log("No REDIS_HOST set, running without Redis cache");
    }

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Database connection error:", error);
  }
};

initializeConnection();
