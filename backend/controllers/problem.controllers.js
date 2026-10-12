

import { Submission } from "../models/submission.model.js"
import { User } from "../models/user.model.js"
import { getLanguageById, submitBatch, submitToken } from "../utils/problem.utility.js"
import { Problem } from "../models/problem.model.js"
import {
    generateProblemWithGemini,
    generateSocraticHint,
    explainCodeError,
    reviewCodeComplexity
} from "../utils/ai.utility.js"

export const createProblem = async(req,res)=>{
    const {title ,  description , difficultyLevel , tags , visibleTestCases,
        hiddenTestCases,startCode,referenceSolution,problemCreator} = req.body
    try {
        
        // CHECK IF PROBLEM TITLE ALREADY EXISTS
        const existing = await Problem.findOne({ title: title.trim() });
        if (existing) {
        return res.status(400).json({
            success: false,
            message: "A problem with this title already exists!",
        });
        }

        //! if the below for loop executes fully means admin ne jo data bheja hia wo ekdum picture perfect hai aur usko ham DB mein store kar skte hai 
        
        for(const {language , completeCode} of referenceSolution){

            //source_code
            // language_id
            //stdin
            //expected_output

            const languageId = getLanguageById(language)

            //creating a batch for submission
            const submissions = visibleTestCases.map((testcase)=>({
                source_code:completeCode,
                language_id : languageId,
                stdin: testcase.input,
                expected_output:testcase.output
            }))

            // Submit the reference solution test cases to Codebox.
            // console.log(submissions);
            
            const submitResult = await submitBatch(submissions)
            // console.log(submitResult);
            const resultToken = submitResult.map((value) => value.token)
            // console.log(resultToken);
            
            const testResult = await submitToken(resultToken)

            
            // console.log(testResult); // this is output from Codebox
            

            for(const [index, test] of testResult.entries()){
                if(test.status_id != 3 ){
                    console.log(`Test failed for ${language} on test #${index + 1}:`, test);
                    const errorDetail = test.stderr || test.compile_output || test.status?.description || "Incorrect output";
                    return res.status(400).json({
                        message: `Validation failed in ${language} reference solution (Test #${index + 1}): ${errorDetail}`
                    });
                }
            }
            
        }

        //now we will store it in db
        const userProblem = await Problem.create({
            ...req.body,
            problemCreator : req.result._id
        })

        res.status(201).json({message:"Problem created successfully"})

    } catch (error) {
        res.status(400).json({message:error.message})
    }
}

export const deleteProblem = async(req,res)=>{
    const {id} = req.params
    try {
        if(!id){
            return res.status(400).send("Id is Missing.")
        }
        const deletedProblem = await Problem.findByIdAndDelete(id);

        if(!deletedProblem){
            return res.status(404).send("Problem is missing.")
        }
        return res.status(200).send("Successfully Deleted Problem.")
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}

export const getProblemById = async(req,res)=>{
    const {id} = req.params
    try {
        if(!id){
            return res.status(400).send("Id is Missing.")
        }
        
        const getProblem = await Problem.findById(id).select('title description difficultyLevel tags visibleTestCases startCode referenceSolution' )

        if(!getProblem){
            return res.status(404).send("Problem is missing")
        }
        return res.status(200).send(getProblem)

    } catch (error) {
        res.status(500).json({message:error.message})
    }
}

/**
 * Teacher/Admin: Fetch complete problem including hiddenTestCases for editing
 */
export const getProblemByIdForAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: "Problem ID is missing" });
        }

        const problem = await Problem.findById(id);

        if (!problem) {
            return res.status(404).json({ success: false, message: "Problem not found" });
        }
        return res.status(200).json({ success: true, data: problem });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Teacher/Admin: Update an existing coding problem
 */
export const updateProblem = async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        difficultyLevel,
        tags,
        visibleTestCases,
        hiddenTestCases,
        startCode,
        referenceSolution,
    } = req.body;

    try {
        if (!id) {
            return res.status(400).json({ success: false, message: "Problem ID is missing" });
        }

        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).json({ success: false, message: "Problem not found" });
        }

        // If title changed, verify uniqueness
        if (title && title.trim().toLowerCase() !== problem.title.toLowerCase()) {
            const existing = await Problem.findOne({
                title: title.trim(),
                _id: { $ne: id },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Another problem with this title already exists!",
                });
            }
        }

        // Validate reference solutions against visible test cases if updated
        if (referenceSolution && Array.isArray(referenceSolution) && visibleTestCases && Array.isArray(visibleTestCases)) {
            for (const { language, completeCode } of referenceSolution) {
                const languageId = getLanguageById(language);
                if (!languageId) continue;

                const submissions = visibleTestCases.map((testcase) => ({
                    source_code: completeCode,
                    language_id: languageId,
                    stdin: testcase.input,
                    expected_output: testcase.output,
                }));

                const submitResult = await submitBatch(submissions);
                const resultToken = submitResult.map((value) => value.token);
                const testResult = await submitToken(resultToken);

                for (const [index, test] of testResult.entries()) {
                    if (test.status_id != 3) {
                        console.log(`Update validation failed for ${language} on test #${index + 1}:`, test);
                        const errorDetail =
                            test.stderr ||
                            test.compile_output ||
                            test.status?.description ||
                            "Incorrect output";
                        return res.status(400).json({
                            success: false,
                            message: `Validation failed in ${language} reference solution (Test #${index + 1}): ${errorDetail}`,
                        });
                    }
                }
            }
        }

        // Update fields
        if (title) problem.title = title.trim();
        if (description) problem.description = description;
        if (difficultyLevel) problem.difficultyLevel = difficultyLevel.toLowerCase();
        if (tags) problem.tags = tags;
        if (visibleTestCases) problem.visibleTestCases = visibleTestCases;
        if (hiddenTestCases) problem.hiddenTestCases = hiddenTestCases;
        if (startCode) problem.startCode = startCode;
        if (referenceSolution) problem.referenceSolution = referenceSolution;

        await problem.save();

        return res.status(200).json({
            success: true,
            message: "Problem updated successfully",
            problem,
        });
    } catch (error) {
        console.error("Update problem error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllProblem = async(req,res)=>{
    
    try {
    
        const getProblem = await Problem.find({}).select("_id title difficultyLevel tags ")

        if(getProblem.length == 0){
            return res.status(404).send("Problem is missing")
        }
        return res.status(200).send(getProblem)

    } catch (error) {
        res.status(500).json({message:error.message})
    }
}

export const solvedAllProblemByUser = async(req,res)=>{
    try {
        
        const userId = req.result._id
        const user = await User.findById(userId).populate({
            path:"problemSolved",
            select:"_id title difficultyLevel tags"
        })
        res.status(200).send(user.problemSolved)

    } catch (error) {
        res.status(500).send("Error "+error || "Internal Server Error")
    }
}

export const submittedProblem = async(req,res)=>{
    try {
        const userId = req.result._id
        const problemId = req.params.pid
        const ans = await Submission.find({userId , problemId})

        if(ans.length == 0){
            return res.status(200).send([])
        }

        return res.status(200).send(ans)
    } catch (error) {
        return res.status(500).send("Internal server error")
    }
}

/**
 * Teacher/Admin AI Copilot: Automatically generate a problem from a prompt/topic
 */
export const generateAiProblem = async (req, res) => {
    try {
        const { prompt, difficultyLevel, tag, visibleCount, hiddenCount } = req.body

        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            return res.status(400).json({ message: "Prompt is required to generate a problem" })
        }

        const generatedData = await generateProblemWithGemini({
            prompt: prompt.trim(),
            difficultyLevel,
            tag,
            visibleCount,
            hiddenCount
        })

        return res.status(200).json({
            success: true,
            data: generatedData
        })
    } catch (error) {
        console.error("AI Problem Generation error:", error)
        return res.status(500).json({
            message: error.message || "Failed to generate problem with AI"
        })
    }
}

/**
 * Student AI Copilot: Socratic hint without spoiling code
 */
export const getAiHint = async (req, res) => {
    try {
        const { problemId, code, language, failedTestCase, hintNumber = 1 } = req.body

        if (!problemId) {
            return res.status(400).json({ message: "Problem ID is required" })
        }

        const problem = await Problem.findById(problemId)
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" })
        }

        // Track user's hint count
        if (req.result?._id) {
            const user = await User.findById(req.result._id)
            if (user) {
                const existingUsage = user.hintUsage.find(
                    (h) => h.problemId.toString() === problemId.toString()
                )
                if (existingUsage) {
                    existingUsage.count += 1
                } else {
                    user.hintUsage.push({ problemId, count: 1 })
                }
                await user.save()
            }
        }

        const hint = await generateSocraticHint({
            problemTitle: problem.title,
            problemDescription: problem.description,
            code,
            language,
            failedTestCase,
            hintNumber
        })

        return res.status(200).json({ success: true, hint, hintNumber })
    } catch (error) {
        console.error("AI Hint error:", error)
        return res.status(500).json({
            message: error.message || "Failed to get AI hint"
        })
    }
}

/**
 * Student AI Copilot: Explain why code failed (Runtime error, Wrong Answer, etc.)
 */
export const getAiExplanation = async (req, res) => {
    try {
        const { problemId, code, language, errorMessage, failedTestCase } = req.body

        if (!problemId) {
            return res.status(400).json({ message: "Problem ID is required" })
        }

        const problem = await Problem.findById(problemId)
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" })
        }

        const explanation = await explainCodeError({
            problemTitle: problem.title,
            problemDescription: problem.description,
            code,
            language,
            errorMessage,
            failedTestCase
        })

        return res.status(200).json({ success: true, explanation })
    } catch (error) {
        console.error("AI Explanation error:", error)
        return res.status(500).json({
            message: error.message || "Failed to explain error"
        })
    }
}

/**
 * Student AI Copilot: Time & Space complexity review
 */
export const getAiComplexity = async (req, res) => {
    try {
        const { problemId, code, language } = req.body

        if (!problemId || !code) {
            return res.status(400).json({ message: "Problem ID and code are required" })
        }

        const problem = await Problem.findById(problemId)
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" })
        }

        const complexity = await reviewCodeComplexity({
            problemTitle: problem.title,
            code,
            language
        })

        return res.status(200).json({ success: true, complexity })
    } catch (error) {
        console.error("AI Complexity error:", error)
        return res.status(500).json({
            message: error.message || "Failed to review complexity"
        })
    }
}

