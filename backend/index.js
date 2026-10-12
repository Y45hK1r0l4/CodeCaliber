import dotenv from "dotenv"
dotenv.config()
import express from "express"
import { connectDB } from "./config/db.js"
import cookieParser from "cookie-parser"
import authRouter from "./routes/userAuth.routes.js"
import { redisClient } from "./config/redis.js"
import problemRouter from "./routes/problem.routes.js"
import cors from 'cors';
import submitRouter from "./routes/submission.routes.js"
import leaderboardRouter from "./routes/leaderboard.routes.js"
const app = express()

//middleware
app.use(express.json())
// app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(
  cors({
    origin: ['http://localhost:5173','http://localhost:5174'],  // your frontend URL
    credentials: true,                 // allow cookies/auth headers
  })
);

const port = process.env.PORT || 5000

//routes
app.use("/user",authRouter)
app.use("/problem",problemRouter)
app.use("/submission",submitRouter)
app.use("/leaderboard",leaderboardRouter)
app.get("/", (req, res) => {
  res.send("Server is running successfully");
});

const initilaizeConnection = async ()=>{
    try {
        await Promise.all([connectDB(),redisClient.connect()])
        app.listen(port , () =>{
            console.log(`Server running on port ${port}`);
        })
        
    } catch (error) {
        console.log("DB connection error : ",error);
        
    }
}

initilaizeConnection()
