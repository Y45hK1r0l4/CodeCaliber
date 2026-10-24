import { Problem } from "../models/problem.model.js"
import { Submission } from "../models/submission.model.js"
import { getLanguageById, submitBatch, submitToken, ensureCppHeader } from "../utils/problem.utility.js"
import { TestAttempt } from "../models/testAttempt.model.js"


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

        const normalizedCode =
            language?.toLowerCase() === "c++" || language?.toLowerCase() === "cpp"
                ? ensureCppHeader(code)
                : code;

        //submit code received from frontend in DB 
        const submittedResult = await Submission.create({
            userId,
            problemId,
            code: normalizedCode,
            language,
            testCasesPassed:0,
            status:'pending',
            testCasesTotal:problem.hiddenTestCases.length
        })

        // Submit code to the local Codebox execution service.
        const languageId = getLanguageById(language)

        //creating a batch for submission
        const submissions = problem.hiddenTestCases.map((testcase)=>({
            source_code: normalizedCode,
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
            let currentError = null;
            if(test.status_id == 3){
                testCasesPassed++;
                runtime += Number.parseFloat(test.time) || 0
                memory = Math.max(memory, test.memory || 0)
            }
            else if(test.status_id == 4){
                status = 'wrong'
                currentError = 'Wrong Answer'
            }
            else if(test.status_id == 6){
                status = 'error'
                currentError = 'Compilation Error: ' + (test.compile_output || test.stderr || '')
            }
            else if(test.status_id >= 7 && test.status_id <= 12){
                status = 'error'
                currentError = 'Runtime Error: ' + (test.stderr || test.status?.description || '')
            }
            else if(test.status_id == 5){
                status = 'error'
                currentError = 'Time Limit Exceeded'
            }
            else{
                status = 'error'
                currentError = 'Unknown Error'
            }

            if (!errorMessage && currentError) {
                errorMessage = currentError;
            }

            if (test.status_id !== 3 && !failedTestCase) {
                failedTestCase = {
                    index: index + 1,
                    input: String(problem.hiddenTestCases[index].input ?? ""),
                    expectedOutput: String(problem.hiddenTestCases[index].output ?? ""),
                    actualOutput: test.stdout !== undefined && test.stdout !== null ? String(test.stdout) : "",
                    error: currentError
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

        let earnedMarks = 0;
        let maxMarks = 10;

        if (req.body.testAttemptId) {
            const attempt = await TestAttempt.findOne({ 
                _id: req.body.testAttemptId, 
                participant: userId, 
                status: "in_progress" 
            }).populate("test");
            if (attempt) {
                const answer = attempt.answers.find((item) => String(item.question) === String(problemId));
                if (answer) {
                    const totalCases = (problem.hiddenTestCases && problem.hiddenTestCases.length > 0) ? problem.hiddenTestCases.length : 1;
                    const passedCases = submittedResult.testCasesPassed || 0;
                    const configuredMarks = (attempt.test?.questionMarks || []).find((qm) => String(qm.question) === String(problemId))?.marks || 10;
                    maxMarks = configuredMarks;
                    earnedMarks = Math.round((passedCases / totalCases) * configuredMarks * 10) / 10;

                    answer.submission = submittedResult._id;
                    answer.code = normalizedCode;
                    answer.language = language;
                    answer.testCasesPassed = passedCases;
                    answer.testCasesTotal = totalCases;
                    answer.maxMarks = maxMarks;
                    answer.earnedMarks = earnedMarks;

                    attempt.score = Math.round((attempt.answers || []).reduce((sum, a) => sum + (a.earnedMarks || 0), 0) * 10) / 10;
                    attempt.total = (attempt.answers || []).reduce((sum, a) => sum + (a.maxMarks || 10), 0);
                    await attempt.save();
                }
            }
        }

        const responseData = submittedResult.toObject();
        const isStaff = ["admin", "evaluator"].includes(req.result.role);
        if (isStaff) {
            responseData.earnedMarks = earnedMarks;
            responseData.maxMarks = maxMarks;
        }

        return res.status(201).json(responseData)


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


        const normalizedCode =
            language?.toLowerCase() === "c++" || language?.toLowerCase() === "cpp"
                ? ensureCppHeader(code)
                : code;

        // Submit code to the local Codebox execution service.
        const languageId = getLanguageById(language);

        //creating a batch for submission against visible test cases
        const submissions = problem.visibleTestCases.map((testcase) => ({
            source_code: normalizedCode,
            language_id: languageId,
            stdin: testcase.input,
            expected_output: testcase.output,
        }));

        // Submit the test cases as a batch to Codebox.
        const submitResult = await submitBatch(submissions);
        const resultToken = submitResult.map((value) => value.token);
        const testResult = await submitToken(resultToken);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let compilationError = null;

        // Check for compilation errors
        for (const test of testResult) {
            if (test.status_id === 6 || test.compile_output) {
                compilationError = test.compile_output || test.stderr || "Compilation failed";
                break;
            }
        }

        const testCaseDetails = problem.visibleTestCases.map((tc, index) => {
            const test = testResult[index] || {};
            const isPassed = test.status_id === 3;
            if (isPassed) {
                testCasesPassed++;
                runtime += Number.parseFloat(test.time) || 0;
                memory = Math.max(memory, test.memory || 0);
            }

            let realError = null;
            if (test.compile_output) {
                realError = test.compile_output;
            } else if (test.stderr) {
                realError = test.stderr;
            } else if (test.status_id === 5) {
                realError = "Time Limit Exceeded";
            } else if (test.status_id === 4) {
                realError = "Wrong Answer";
            } else if (test.status_id !== 3) {
                realError = test.status?.description || "Runtime Error";
            }

            return {
                index: index + 1,
                input: String(tc.input ?? ""),
                expectedOutput: String(tc.output ?? ""),
                actualOutput: test.stdout !== undefined && test.stdout !== null ? String(test.stdout) : "",
                passed: isPassed,
                status: test.status?.description || (isPassed ? "Accepted" : "Failed"),
                statusId: test.status_id,
                time: test.time || 0,
                memory: test.memory || 0,
                error: realError,
                stderr: test.stderr || null,
                compileOutput: test.compile_output || null,
            };
        });

        let overallStatus = "accepted";
        let errorMessage = null;

        if (compilationError) {
            overallStatus = "error";
            errorMessage = `Compilation Error: ${compilationError}`;
        } else if (testCasesPassed === problem.visibleTestCases.length) {
            overallStatus = "accepted";
            errorMessage = null;
        } else {
            const firstFailed = testCaseDetails.find((t) => !t.passed);
            if (firstFailed && firstFailed.statusId >= 7 && firstFailed.statusId <= 12) {
                overallStatus = "error";
                errorMessage = `Runtime Error: ${firstFailed.stderr || firstFailed.error}`;
            } else if (firstFailed && firstFailed.statusId === 5) {
                overallStatus = "error";
                errorMessage = "Time Limit Exceeded";
            } else {
                overallStatus = "wrong";
                errorMessage = "Wrong Answer";
            }
        }

        const failedTestCase = testCaseDetails.find((t) => !t.passed) || null;

        const submittedResult = {
            userId,
            problemId,
            code: normalizedCode,
            language,
            testCasesPassed,
            testCasesTotal: problem.visibleTestCases.length,
            status: overallStatus,
            errorMessage,
            compilationError,
            runtime,
            memory,
            testCaseDetails,
            failedTestCase,
        };

        return res.status(200).json(submittedResult);


    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal Server Error" })
    }
}