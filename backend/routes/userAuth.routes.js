import express,{ Router } from "express";
import { adminRegister, createTeacher, getAllUsers, getProfile, getTeachers, login, logout, register } from "../controllers/userAuth.controllers.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import isEmail from "validator/lib/isEmail.js";

const authRouter = Router()

authRouter.post("/register",register)
authRouter.post("/admin/register", adminMiddleware, adminRegister)
authRouter.post("/teachers", adminMiddleware, createTeacher)
authRouter.get("/teachers", adminMiddleware, getTeachers)
authRouter.post("/evaluators", adminMiddleware, createTeacher)
authRouter.get("/evaluators", adminMiddleware, getTeachers)
authRouter.post("/login",login)
authRouter.post("/logout",userMiddleware,logout)
authRouter.get("/check",userMiddleware,(req,res)=>{
    if(!req.result){
        return res.status(401).json({
            user:null,
            message: "Not authenticated"
        })
    }
    const reply = {
        firstName : req.result.firstName,
        emailId: req.result.emailId,
        _id : req.result._id,
        role:req.result.role
    }
    res.status(200).json({
        user:reply,
        message: "valid user"
    })
})

authRouter.get("/getProfile",userMiddleware,getProfile)
authRouter.get("/getProfile/:id", userMiddleware, getProfile);
authRouter.get("/getAllUsers",adminMiddleware,getAllUsers)
export default authRouter