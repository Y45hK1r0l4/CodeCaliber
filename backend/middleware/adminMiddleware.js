import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import { redisClient } from "../config/redis.js";

export const adminMiddleware = async(req,res,next)=>{
    try {
        const {token} = req.cookies;
        if(!token){
            throw new Error("Token is not present")
        }
        const payload = jwt.verify(token,process.env.JWT_KEY)
        const {_id} = payload
        if(!_id){
            throw new Error("Invalid token")
        }

        const result = await User.findById(_id)

        //check if person who is performing task is admin or evaluator
        const staffRoles = ['admin', 'evaluator']
        if(!staffRoles.includes(payload.role) && !staffRoles.includes(result?.role)){
            throw new Error("Staff access is required for this task")
        }

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
        const isAuthError = error.message.includes("Token") || error.message.includes("token");
        const status = isAuthError ? 401 : 403;
        return res.status(status).json({ message: error.message || "Unauthorized access" });
    }
}