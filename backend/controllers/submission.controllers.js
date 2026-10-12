import { Problem } from "../models/problem.model.js"
import { Submission } from "../models/submission.model.js"
import { getLanguageById, submitBatch, submitToken } from "../utils/problem.utility.js"


export const submitCode = async(req,res)=>{
    try {
        const userId = req.result._id
        const problemId = req.params.id

        const {code , language} = req.body

        if(!userId || !code || !problemId || !language){
            return res.status(400).send("Some field is missing.")
        }

        //fetch the problem for DB
        const problem = await Problem.findById(problemId)  //from here we can get hidden testcases

        //if problem is invalid or not found
        if (!problem) {
            return res.status(404).send("Problem not found.");
        }

        //submit code received from frontend in DB 
        const submittedResult = await Submission.create({
            userId,
            problemId,
            code,
            language,
            testCasesPassed:0,
            status:'pending',
            testCasesTotal:problem.hiddenTestCases.length
        })

        // Submit code to the local Codebox execution service.
        const languageId = getLanguageById(language)

        //creating a batch for submission
        const submissions = problem.hiddenTestCases.map((testcase)=>({
            source_code:code,
            language_id : languageId,
            stdin: testcase.input,
            expected_output:testcase.output
        }))

         // Submit the test cases as a batch to Codebox.
        const submitResult = await submitBatch(submissions)

        const resultToken = submitResult.map((value) => value.token)

        const testResult = await submitToken(resultToken)

        //update result in DB (submission schema)
        // 1 . check for error
        let testCasesPassed = 0
        let runtime = 0, memory = 0
        let status = 'accepted'
        let errorMessage = null
        let failedTestCase = null

       for(const [index, test] of testResult.entries()){
             if(test.status_id == 3){
                 testCasesPassed++;
                 runtime += Number.parseFloat(test.time) || 0
                 memory = Math.max(memory, test.memory || 0)
             }
             else if(test.status_id == 4){
                 status = 'wrong'
                 errorMessage = 'Wrong Answer'
             }
             else if(test.status_id == 6){
                 status = 'error'
                 errorMessage = 'Compilation Error: ' + (test.stderr || test.compile_output || '')
             }
             else if(test.status_id >= 7 && test.status_id <= 12){
                 status = 'error'
                 errorMessage = 'Runtime Error: ' + (test.stderr || '')
             }
             else if(test.status_id == 5){
                 status = 'error'
                 errorMessage = 'Time Limit Exceeded'
             }
             else{
                 status = 'error'
                 errorMessage = 'Unknown Error'
             }

              if (test.status_id !== 3 && !failedTestCase) {
                  failedTestCase = {
                      index: index + 1,
                      input: problem.hiddenTestCases[index].input,
                      expectedOutput: problem.hiddenTestCases[index].output,
                      actualOutput: test.stdout || null,
                      error: errorMessage
                  }
              }
         }

        //2.store the result in Database in submission
        submittedResult.status = status
        submittedResult.testCasesPassed = testCasesPassed
        submittedResult.errorMessage = errorMessage
        submittedResult.runtime = runtime
        submittedResult.memory = memory
        submittedResult.failedTestCase = failedTestCase

        await submittedResult.save()

        //check whether the problemId is present in problemSolved in User Schema.
        //If not present we will store it in DB.
        //req.result has user information
        if(status === 'accepted' && !req.result.problemSolved.includes(problemId)){
            req.result.problemSolved.push(problemId)
            await req.result.save()
        }

        return res.status(201).send(submittedResult)


    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal Server Error" })
    }
}

export const runCode = async(req,res)=>{
    try {
        const userId = req.result._id
        const problemId = req.params.id

        const {code , language} = req.body

        if(!userId || !code || !problemId || !language){
            return res.status(400).send("Some field is missing.")
        }

        //fetch the problem for DB
        const problem = await Problem.findById(problemId)  //from here we can get hidden testcases

        //if problem is invalid or not found
        if (!problem) {
            return res.status(404).send("Problem not found.");
        }


        // Submit code to the local Codebox execution service.
        const languageId = getLanguageById(language)

        //creating a batch for submission
        const submissions = problem.visibleTestCases.map((testcase)=>({
            source_code:code,
            language_id : languageId,
            stdin: testcase.input,
            expected_output:testcase.output
        }))

         // Submit the test cases as a batch to Codebox.
        const submitResult = await submitBatch(submissions)

        const resultToken = submitResult.map((value) => value.token)

        const testResult = await submitToken(resultToken)

        const submittedResult =({
            userId,
            problemId,
            code,
            language,
            testCasesPassed:0,
            status:'pending',
            testCasesTotal:problem.hiddenTestCases.length
        })

        // 1 . check for error
        let testCasesPassed = 0
        let runtime = 0, memory = 0
        let status = 'accepted'
        let errorMessage = null

       for(const test of testResult){
             if(test.status_id == 3){
                 testCasesPassed++;
                 runtime = runtime + parseFloat(test.time)
                 memory = Math.max(memory , test.memory)
             }
             else if(test.status_id == 4){
                 status = 'wrong'
                 errorMessage = 'Wrong Answer'
             }
             else if(test.status_id == 6){
                 status = 'error'
                 errorMessage = 'Compilation Error: ' + (test.stderr || test.compile_output || '')
             }
             else if(test.status_id >= 7 && test.status_id <= 12){
                 status = 'error'
                 errorMessage = 'Runtime Error: ' + (test.stderr || '')
             }
             else if(test.status_id == 5){
                 status = 'error'
                 errorMessage = 'Time Limit Exceeded'
             }
             else{
                 status = 'error'
                 errorMessage = 'Unknown Error'
             }
         }

        //2.store the result in Database in submission
        submittedResult.status = status
        submittedResult.testCasesPassed = testCasesPassed
        submittedResult.errorMessage = errorMessage
        submittedResult.runtime = runtime
        submittedResult.memory = memory

        return res.status(201).send(submittedResult)


    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal Server Error" })
    }
}