import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import { redisClient } from "../config/redis.js";

export const userMiddleware = async(req,res,next)=>{
    try {
        const {token} = req.cookies;
        if(!token){
            // throw new Error("Token is not present")
            req.result = null
            return next()
        }
        const payload = jwt.verify(token,process.env.JWT_KEY)
        const {_id} = payload
        if(!_id){
            throw new Error("Invalid token")
        }

        const result = await User.findById(_id)

        if(!result){
            throw new Error("User doesn't exists")
        }

        // If redis is connected, check if token is present in blocklist
        if (redisClient.isOpen) {
          const isBlocked = await redisClient.exists(`token:${token}`);
          if (isBlocked) {
            throw new Error("Invalid or revoked token");
          }
        }
        req.result = result
        next()
    } catch (error) {
        return res.status(401).json({ message: error.message || "Authentication failed" });
    }
}