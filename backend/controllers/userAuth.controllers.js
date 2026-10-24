import { redisClient } from "../config/redis.js";
import { Submission } from "../models/submission.model.js";
import { User } from "../models/user.model.js";
import validate from "../utils/validator.js";
import bcrypt, { hash }  from "bcryptjs";
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { Organization } from "../models/organization.model.js";
import { TestAttempt } from "../models/testAttempt.model.js";
import { Test } from "../models/test.model.js";


export const register = async(req,res)=>{
    try {
        console.log("Incoming body:", req.body);
        //validate the data
        validate(req.body)
        console.log("Validation passed");

        const {firstName , emailId , password, institutionName, accountType, joinCode} = req.body

        const existingUser = await User.findOne({ emailId: emailId.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists. Please sign in." });
        }

        //hash the password
        req.body.password = await bcrypt.hash(password,10)
        req.body.emailId = emailId.toLowerCase()

        const orgName = req.body.organizationName || req.body.institutionName;

        // Explicit account type or organization setup grants admin role
        if (accountType === "evaluator" || accountType === "educator" || accountType === "admin" || (orgName && orgName.trim())) {
            req.body.role = "admin";
        } else {
            req.body.role = "participant";
        }

        const user = await User.create(req.body)

        if (user.role === "admin") {
            const code = `${String(orgName || "CODECALIBER").replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
            const org = await Organization.create({
                name: orgName || "My Organization",
                code,
                createdBy: user._id,
            });
            user.organization = org._id;
            await user.save();
        }

        //generate token 
        const token = jwt.sign({_id:user._id,emailId:user.emailId , role:user.role},process.env.JWT_KEY ,{expiresIn : 7*24*60*60})

        const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENVIRONMENT === "production";
        res.cookie('token',token,{
            httpOnly:true,
            secure:isProduction,
            sameSite:isProduction ? "none" : "lax",
            maxAge:7*24*60*60*1000
        })

        const reply={
            firstName : user.firstName,
            emailId : user.emailId,
            _id : user._id,
            role: user.role
        }

        res.status(201).json({
            user:reply,
            message:"User registered successfully"
        })

    } catch (error) {
        res.status(400).json({message:error.message})
    }
}

export const login = async(req,res)=>{
    try {
        const {emailId , password} = req.body

        if(!emailId || !password){
            throw new Error("Invalid Credentials")
        }

        const user = await User.findOne({emailId})

        const match =await  bcrypt.compare(password,user.password)
        if(!match){
            throw new Error("Invalid Credentials")
        }

        const reply={
            firstName : user.firstName,
            emailId : user.emailId,
            _id : user._id,
            role: user.role
        }

        const token = jwt.sign({_id:user._id,emailId , role:user.role},process.env.JWT_KEY ,{expiresIn : 7*24*60*60})

        const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENVIRONMENT === "production";
        res.cookie('token',token,{
            httpOnly:true,
            secure:isProduction,
            sameSite:isProduction ? "none" : "lax",
            maxAge:7*24*60*60*1000
        })

        res.status(201).json({
            user:reply,
            message:"Login Successful"
        })


    } catch (error) {
        res.status(401).json({message:error.message})
    }
}

export const logout = async(req,res)=>{
    try {
        const {token} = req.cookies;

        if (token && redisClient.isOpen) {
            const payload = jwt.decode(token);
            if (payload?.exp) {
                await redisClient.set(`token:${token}`,'Blocked');
                await redisClient.expireAt(`token:${token}`,payload.exp);
            }
        }

        const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENVIRONMENT === "production";
        res.cookie("token", "", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            expires: new Date(0),
        });

        res.status(200).send("Logged Out Successful");
    } catch (error) {
        res.status(503).json({message:error.message});
    }
}

export const getProfile = async (req, res) => {
  try {
    //Allow both user and admin access
    const userId = req.params.id || req.user?._id || req.result?._id; 

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user ID missing",
      });
    }

    // Fetch user and populate solved problems
    const user = await User.findById(userId)
      .select("-password -__v")
      .populate({
        path: "problemSolved",
        select: "title difficultyLevel tags",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    
    // Fetch assessments taken by this user
    const attempts = await TestAttempt.find({ participant: userId })
      .populate({
        path: "test",
        select: "title testCode totalMarks durationMinutes startsAt endsAt createdBy",
        populate: {
          path: "createdBy",
          select: "firstName lastName emailId",
        },
      })
      .sort({ createdAt: -1 });

    // Check if the viewer is staff
    const viewerRole = req.result?.role || req.user?.role;
    const isStaffViewer = ["admin", "evaluator"].includes(viewerRole);

    const assessments = attempts
      .filter((att) => att.test != null)
      .map((att) => {
        const testTotal = att.total > 0 ? att.total : (att.test?.totalMarks || 100);
        const score = att.score || 0;
        const percentage = testTotal > 0 ? Math.round((score / testTotal) * 100) : 0;
        
        // Count solved questions for this assessment
        const questionsSolved = (att.answers || []).filter(
          (ans) => (ans.earnedMarks > 0 && ans.earnedMarks >= (ans.maxMarks || 10)) ||
                   (ans.testCasesPassed > 0 && ans.testCasesPassed === ans.testCasesTotal)
        ).length;
        const totalQuestions = att.answers?.length || 0;

        const assessmentData = {
          id: att._id,
          testId: att.test._id,
          title: att.test.title,
          testCode: att.test.testCode,
          durationMinutes: att.test.durationMinutes,
          questionsSolved,
          totalQuestions,
          status: att.status,
          integrityStatus: att.integrityStatus || "clean",
          tabSwitches: att.tabSwitches || 0,
          fullscreenExits: att.fullscreenExits || 0,
          startedAt: att.startedAt,
          submittedAt: att.submittedAt || att.updatedAt,
          createdBy: att.test.createdBy ? {
            id: att.test.createdBy._id,
            name: `${att.test.createdBy.firstName || ""} ${att.test.createdBy.lastName || ""}`.trim() || att.test.createdBy.emailId,
            emailId: att.test.createdBy.emailId,
          } : null,
        };

        if (isStaffViewer) {
          assessmentData.score = score;
          assessmentData.total = testTotal;
          assessmentData.percentage = percentage;
        }

        return assessmentData;
      });

    // Also fetch tests created by this user (for evaluators / admin)
    const testsCreated = await Test.find({ createdBy: userId })
      .select("title testCode totalMarks durationMinutes startsAt endsAt published createdAt")
      .sort({ createdAt: -1 });

    const userProfile = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailId: user.emailId,
      role: user.role,
      totalSolved: user.problemSolved?.length || 0,
      problemsSolved: (user.problemSolved || []).map((p) => ({
        id: p._id,
        title: p.title,
        difficulty: p.difficultyLevel,
        tags: p.tags,
      })),
      assessments,
      totalAssessmentsTaken: assessments.length,
      averageScore: isStaffViewer && assessments.length > 0 
        ? Math.round(assessments.reduce((sum, a) => sum + (a.percentage || 0), 0) / assessments.length) 
        : null,
      testsCreated: testsCreated.map((t) => ({
        id: t._id,
        title: t.title,
        testCode: t.testCode,
        totalMarks: t.totalMarks,
        durationMinutes: t.durationMinutes,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        published: t.published,
        createdAt: t.createdAt,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


export const adminRegister = async(req,res)=>{
    try {
        if (req.result.role !== "admin") {
            return res.status(403).json({ message: "Only administrators can add staff" });
        }

        validate(req.body)

        const {firstName , emailId , password} = req.body

        //hash the password
        req.body.password = await bcrypt.hash(password,10)

        //!to ensure invalid person doesnt register as admin
        req.body.role = "evaluator"
        const orgId = req.result.organization || (await Organization.findOne({ createdBy: req.result._id }))?._id;
        req.body.organization = orgId;

        const user = await User.create(req.body)

        res.status(201).json({
            message: "User created successfully by admin",
            user: { _id: user._id, emailId: user.emailId, role: user.role },
        });

    } catch (error) {
        res.status(400).json({message:error.message})
    }
}

export const getAllUsers = async (req, res) => {
  try {
    const staffRoles = ["admin", "evaluator"];
    if (!staffRoles.includes(req.result.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied! Staff only.",
      });
    }

    const orgId = req.result.organization 
      || (await Organization.findOne({ createdBy: req.result._id }))?._id;

    // Show users in my organization or participants (test takers)
    const query = orgId 
      ? { $or: [{ organization: orgId }, { role: "participant" }] }
      : {};

    const users = await User.find(query)
      .select("-password")
      .populate("organization", "name code")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const createEvaluator = async (req, res) => {
  try {
    if (req.result.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can create evaluator accounts" });
    }
    const { firstName, lastName = "", emailId } = req.body;
    if (!firstName || !emailId) return res.status(400).json({ message: "Evaluator name and email are required" });
    const exists = await User.findOne({ emailId: emailId.toLowerCase() });
    if (exists) return res.status(409).json({ message: "An account with this email already exists" });
    // Link evaluator to the admin's organization
    const orgId = req.result.organization || (await Organization.findOne({ createdBy: req.result._id }))?._id;

    const temporaryPassword = `CodeCaliber-${crypto.randomBytes(5).toString("hex")}`;
    const evaluator = await User.create({
      firstName,
      lastName,
      emailId: emailId.toLowerCase(),
      password: await bcrypt.hash(temporaryPassword, 10),
      role: "evaluator",
      organization: orgId,
    });

    res.status(201).json({
      message: "Evaluator account created",
      credentials: { firstName: evaluator.firstName, emailId: evaluator.emailId, temporaryPassword },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const createTeacher = createEvaluator;

export const getEvaluators = async (req, res) => {
  try {
    const staffRoles = ["admin", "evaluator"];
    if (!staffRoles.includes(req.result.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const orgId = req.result.organization || (await Organization.findOne({ createdBy: req.result._id }))?._id;
    const query = orgId 
      ? { organization: orgId, role: { $in: ["evaluator", "admin"] } }
      : { role: { $in: ["evaluator", "admin"] } };

    const evaluators = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, evaluators, teachers: evaluators });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getTeachers = getEvaluators;
