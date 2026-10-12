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

        //if token is present in redis blocklist
        const isBlocked =  await redisClient.exists(`token:${token}`)
        if(isBlocked){
            throw new Error("Invalid token")
        }
        req.result = result
        next()
    } catch (error) {
        res.status(500).send("Error : "+error)
    }
}