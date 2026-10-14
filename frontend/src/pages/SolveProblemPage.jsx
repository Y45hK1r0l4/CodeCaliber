import React, { useEffect, useRef, useState } from "react";
import { useParams, NavLink } from "react-router";
import { useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import { axiosClient } from "../utils/axiosClient";
import { ensureCppHeader } from "../utils/codeUtils";
import Toast from "../components/Toaster";
import { Sparkles, Lightbulb, Bug, Gauge, Loader2, CheckCircle2, ChevronRight, Pencil, Terminal } from "lucide-react";

const languageOptions = ["c++", "java", "javascript"];

export default function SolveProblemPage() {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState("c++");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("description"); // description | submissions | solution
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null); // result of last SUBMIT
  const [runResult, setRunResult] = useState(null); // result of last RUN
  const [lastAction, setLastAction] = useState(null); // 'run' | 'submit' | null
  const [bottomTab, setBottomTab] = useState("testcase"); // 'testcase' | 'testresult' | 'submission'
  const [testCaseResults, setTestCaseResults] = useState([]); // array of booleans: true = passed
  const [hasAccepted, setHasAccepted] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [hint, setHint] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [toast, setToast] = useState(null);
  const [hintError, setHintError] = useState("");

  // AI Copilot state
  const [hintCount, setHintCount] = useState(0);
  const [hintsList, setHintsList] = useState([]);
  const [aiErrorExplanation, setAiErrorExplanation] = useState("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [aiComplexity, setAiComplexity] = useState(null);
  const [loadingComplexity, setLoadingComplexity] = useState(false);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleGetAiHint = async () => {
    try {
      setLoadingHint(true);
      const nextHintNum = hintCount + 1;
      const res = await axiosClient.post("/problem/ai-hint", {
        problemId: id,
        code,
        language,
        hintNumber: nextHintNum,
        failedTestCase: submissionResult?.failedTestCase || runResult?.failedTestCase || null,
      });

      if (res.data?.hint) {
        setHintsList((prev) => [
          ...prev,
          { number: nextHintNum, text: res.data.hint },
        ]);
        setHintCount(nextHintNum);
        showToast(`AI Hint #${nextHintNum} ready!`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to fetch AI hint", "error");
    } finally {
      setLoadingHint(false);
    }
  };

  const handleExplainError = async () => {
    try {
      setLoadingExplanation(true);
      setAiErrorExplanation("");
      const res = await axiosClient.post("/problem/ai-explain", {
        problemId: id,
        code,
        language,
        errorMessage: output || submissionResult?.errorMessage || runResult?.errorMessage || "Test case failure",
        failedTestCase: submissionResult?.failedTestCase || runResult?.failedTestCase || null,
      });

      if (res.data?.explanation) {
        setAiErrorExplanation(res.data.explanation);
        showToast("Error diagnostic ready!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to analyze error", "error");
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleAnalyzeComplexity = async () => {
    try {
      setLoadingComplexity(true);
      setAiComplexity(null);
      const res = await axiosClient.post("/problem/ai-complexity", {
        problemId: id,
        code,
        language,
      });

      if (res.data?.complexity) {
        setAiComplexity(res.data.complexity);
        showToast("Complexity analyzed!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to analyze complexity", "error");
    } finally {
      setLoadingComplexity(false);
    }
  };

  const editorRef = useRef(null);

  // fetch problem once
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await axiosClient.get(`/problem/ProblemById/${id}`);
        const prob = res.data;
        setProblem(prob);

        // load starter code for default language (c++)
        const start = prob.startCode?.find(
          (s) => s.language.toLowerCase() === "c++"
        );
        if (start && start.initialCode) {
          setCode(ensureCppHeader(start.initialCode));
        } else {
          setCode("");
        }
      } catch (err) {
        console.error("Error fetching problem:", err);
      }
    };
    fetchProblem();
  }, [id]);

  // fetch submissions (when user opens the tab or after submit)
  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await axiosClient.get(`/problem/submittedProblem/${id}`);
      const subs = Array.isArray(res.data) ? res.data : [];
      setSubmissions(subs);

      // if any accepted previously, allow solution tab
      if (subs.some((s) => s.status === "accepted")) {
        setHasAccepted(true);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    const start = problem?.startCode?.find(
      (s) => s.language.toLowerCase() === lang.toLowerCase()
    );
    if (start && start.initialCode) {
      setCode(lang === "c++" ? ensureCppHeader(start.initialCode) : start.initialCode);
    } else {
      setCode("");
    }
  };

  const handleRunCode = async () => {
    try {
      setLastAction("run");
      setBottomTab("testresult");
      setIsRunning(true);
      setOutput("");
      setRunResult(null);
      setSubmissionResult(null);
      setTestCaseResults([]);

      const res = await axiosClient.post(`/submission/run/${id}`, {
        code,
        language,
      });

      const data = res.data;
      setRunResult(data);

      const totalVisible = problem.visibleTestCases.length;
      const passed = data.testCasesPassed ?? 0;

      // Set accurate per-test case pass/fail from testCaseDetails
      if (Array.isArray(data.testCaseDetails)) {
        setTestCaseResults(data.testCaseDetails.map((td) => td.passed));
      } else {
        const resultsArray = Array.from({ length: totalVisible }, (_, i) => i < passed);
        setTestCaseResults(resultsArray);
      }

      // If compilation error occurred:
      if (data.compilationError) {
        setOutput(`Compilation Error:\n${data.compilationError}`);
        return;
      }

      // Build structured output summary
      let summary = `Status: ${String(data.status).toUpperCase()}\nTest Cases Passed: ${passed}/${totalVisible}\nRuntime: ${data.runtime ?? 0} sec\nMemory: ${data.memory ?? 0} KB`;

      if (data.status !== "accepted") {
        const failedTc = data.failedTestCase || data.testCaseDetails?.find((t) => !t.passed);
        if (failedTc) {
          summary += `\n\n--- Test Case ${failedTc.index} Failed ---`;
          summary += `\nInput:\n${failedTc.input}`;
          summary += `\nExpected Output:\n${failedTc.expectedOutput}`;
          summary += `\nYour Output:\n${failedTc.actualOutput !== "" ? failedTc.actualOutput : "(No output produced)"}`;
          if (failedTc.error && failedTc.error !== "Wrong Answer") {
            summary += `\nError:\n${failedTc.error}`;
          }
        }
      } else {
        summary += `\n\nAll ${totalVisible} sample test cases passed successfully!`;
      }

      setOutput(summary);
    } catch (err) {
      console.error(err);
      setOutput(err.response?.data?.message || err.message || "Error executing code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLastAction("submit");
      setBottomTab("submission");
      setIsSubmitting(true);
      setSubmissionResult(null);
      setOutput("");
      setRunResult(null);
      setTestCaseResults([]);
      const res = await axiosClient.post(`/submission/submit/${id}`, {
        code,
        language,
      });
      const data = res.data;
      setSubmissionResult(data);

      if (data.status === "accepted") {
        setHasAccepted(true);
      }

      setSubmissions((prev) => (data ? [data, ...prev] : prev));
    } catch (err) {
      console.error("Submit error:", err);
      setSubmissionResult({
        status: "error",
        errorMessage: "Submission failed. Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSubmission = (submission) => {
    if (!submission) return;
    setCode(submission.code);
    setSelectedSubmission(submission);
    setSubmissionResult(submission);

    const total = submission.testCasesTotal ?? problem.visibleTestCases.length;
    const passed = submission.testCasesPassed ?? 0;
    const resultsArray = Array.from({ length: total }, (_, i) => i < passed);
    setTestCaseResults(resultsArray);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Disable right-click context menu
    editor.updateOptions({ contextmenu: false });

    // Disable Ctrl+C / Ctrl+V / Ctrl+X shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {});

    // Disable clipboard events
    const domNode = editor.getDomNode();
    if (domNode) {
      ["copy", "paste", "cut", "contextmenu"].forEach((evt) => {
        domNode.addEventListener(evt, (e) => e.preventDefault());
      });
    }
  };


  if (!problem) return <p className="p-6 text-gray-600">Loading problem...</p>;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col md:flex-row">
      {/* LEFT PANEL */}
      <div className="md:w-1/2 border-r border-gray-300 p-6 overflow-y-auto bg-white">
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {["description", "submissions", "solution", "ai-copilot"].map((tab) => (
            <button
              key={tab}
              disabled={tab === "solution" && !hasAccepted}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "submissions") fetchSubmissions();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === tab
                  ? tab === "ai-copilot"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30"
                    : "bg-blue-600 text-white border-blue-600"
                  : tab === "solution" && !hasAccepted
                  ? "text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50"
                  : tab === "ai-copilot"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {tab === "ai-copilot" ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  AI Copilot
                  {hintsList.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-indigo-200 text-indigo-800 text-[10px] rounded-full">
                      {hintsList.length}
                    </span>
                  )}
                </span>
              ) : (
                tab.charAt(0).toUpperCase() + tab.slice(1)
              )}
            </button>
          ))}
        </div>


        {/* Description */}
        {activeTab === "description" && (
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <h1 className="text-2xl font-bold text-black">{problem.title}</h1>
              {user?.role === "admin" && (
                <NavLink
                  to={`/admin/editProblem/${problem._id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Problem
                </NavLink>
              )}
            </div>

            <div className="text-gray-800 whitespace-pre-line leading-relaxed text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              {String(problem.description || "")
                .replace(/\$\$(.*?)\$\$/g, "$1")
                .replace(/\$(.*?)\$/g, "$1")
                .replace(/\\le\b/g, "<=")
                .replace(/\\ge\b/g, ">=")
                .replace(/\\times\b/g, "×")
                .replace(/\\pm\b/g, "±")
                .replace(/\\neq\b/g, "≠")
                .replace(/\\dots\b/g, "...")
                .replace(/^###\s+/gm, "")
                .replace(/^##\s+/gm, "")}
            </div>

            <p className="text-sm text-gray-600 mt-4">
              Difficulty:{" "}
              <span
                className={
                  problem.difficultyLevel === "easy"
                    ? "text-green-600"
                    : problem.difficultyLevel === "medium"
                    ? "text-yellow-600"
                    : "text-red-600"
                }
              >
                {problem.difficultyLevel}
              </span>
            </p>

            <h3 className="text-lg font-semibold text-black mt-6 mb-3">
              Example Test Cases
            </h3>

            <div className="space-y-4">
              {problem.visibleTestCases?.map((t, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-300 p-3 rounded"
                >
                  <p className="text-sm mb-2">
                    <strong>Input:</strong>
                    <div className="whitespace-pre-wrap text-gray-800 bg-white border rounded p-2 mt-1">
                      {String(t.input)}
                    </div>
                  </p>

                  <p className="text-sm mb-2">
                    <strong>Expected Output:</strong>
                    <p className="whitespace-pre-wrap text-gray-800 bg-white border rounded p-2 mt-1">
                      {String(t.output)}
                    </p>
                  </p>

                  {t.explanation && (
                    <p className="text-xs text-gray-500 mt-1">{t.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submissions */}
        {activeTab === "submissions" && (
          <div className="bg-white border rounded p-5">
            <h2 className="text-xl font-semibold mb-4 text-black">
              Your Submissions
            </h2>

            {loadingSubmissions ? (
              <p className="text-gray-500">Loading submissions...</p>
            ) : submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission._id}
                    onClick={() => handleViewSubmission(submission)}
                    className={`p-4 rounded border cursor-pointer ${
                      selectedSubmission?._id === submission._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          submission.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : submission.status === "runtime error"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {submission.status.toUpperCase()}
                      </span>

                      <p className="text-xs text-gray-500">
                        {new Date(submission.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <div>
                        <p>
                          <span className="text-gray-500">Runtime:</span>{" "}
                          {submission.runtime}s
                        </p>
                        <p>
                          <span className="text-gray-500">Memory:</span>{" "}
                          {submission.memory}KB
                        </p>
                      </div>

                      <div className="text-gray-500 text-xs">
                        Language: {submission.language || "C++"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500 text-sm mb-2">
                  You haven’t submitted any solutions yet.
                </p>
                <p className="text-gray-400 text-xs">
                  Solve the problem and view your submissions here!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Solution */}
        {activeTab === "solution" && hasAccepted && (
          <div>
            <h2 className="text-xl font-semibold text-black mb-3">
              Solution
            </h2>
            <pre className="bg-gray-50 border border-gray-300 p-3 rounded text-sm whitespace-pre-wrap overflow-x-auto">
              {(() => {
                if (!problem.referenceSolution)
                  return "No solution available.";
                const sol = problem.referenceSolution.find(
                  (r) =>
                    r.language?.toLowerCase() === language.toLowerCase() ||
                    (r.language === "c++" && language === "c++")
                );
                if (!sol) return JSON.stringify(problem.referenceSolution, null, 2);
                return (sol.language?.toLowerCase() === "c++" || sol.language === "cpp" || language === "c++")
                  ? ensureCppHeader(sol.completeCode)
                  : sol.completeCode;
              })()}
            </pre>
          </div>
        )}

        {/* AI Copilot Tab */}
        {activeTab === "ai-copilot" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h2 className="text-lg font-bold">AI Socratic Copilot</h2>
              </div>
              <p className="text-xs text-indigo-200">
                Your personal pedagogical lab assistant. Get progressive hints without code spoilers, diagnose test failures, and verify Big-O time and space complexity.
              </p>
            </div>

            {/* ACTION 1: SOCRATIC HINTS */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Socratic Hints ({hintsList.length}/3)
                  </h3>
                </div>
                <button
                  onClick={handleGetAiHint}
                  disabled={loadingHint || hintCount >= 3}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {loadingHint ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : hintCount >= 3 ? (
                    <span>Max Hints Reached</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ask Hint #{hintCount + 1}</span>
                    </>
                  )}
                </button>
              </div>

              {hintsList.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Stuck? Click above to get an intuition-based hint without spoiling the solution.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {hintsList.map((h, i) => (
                    <div
                      key={i}
                      className="bg-white border border-amber-200/80 rounded-lg p-3 text-xs space-y-1 shadow-sm"
                    >
                      <span className="font-bold text-amber-700 uppercase tracking-wider text-[10px]">
                        Hint {h.number}
                        {h.number === 1 ? " • Conceptual Intuition" : h.number === 2 ? " • Edge-Case Alert" : " • Logic Structure"}
                      </span>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                        {h.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ACTION 2: ERROR DIAGNOSTIC */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Error & Bug Diagnostician
                  </h3>
                </div>
                <button
                  onClick={handleExplainError}
                  disabled={loadingExplanation || !code}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {loadingExplanation ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Bug className="w-3.5 h-3.5" />
                      <span>Diagnose Bug</span>
                    </>
                  )}
                </button>
              </div>

              {aiErrorExplanation ? (
                <div className="bg-white border border-rose-200 rounded-lg p-3 text-xs space-y-1 shadow-sm">
                  <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px]">
                    Bug Analysis & Guidance
                  </span>
                  <div className="text-slate-700 whitespace-pre-line leading-relaxed">
                    {aiErrorExplanation}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Got a Wrong Answer or Runtime Error? Click &quot;Diagnose Bug&quot; to understand why without revealing the answer.
                </p>
              )}
            </div>

            {/* ACTION 3: COMPLEXITY REVIEW */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Time & Space Complexity Verifier
                  </h3>
                </div>
                <button
                  onClick={handleAnalyzeComplexity}
                  disabled={loadingComplexity || !code}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {loadingComplexity ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reviewing...</span>
                    </>
                  ) : (
                    <>
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Analyze Big-O</span>
                    </>
                  )}
                </button>
              </div>

              {aiComplexity ? (
                <div className="bg-white border border-indigo-200 rounded-lg p-3 text-xs space-y-2 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Time Complexity</span>
                      <span className="font-mono font-bold text-indigo-700 text-sm">{aiComplexity.timeComplexity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Space Complexity</span>
                      <span className="font-mono font-bold text-purple-700 text-sm">{aiComplexity.spaceComplexity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Efficiency</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${aiComplexity.isOptimal ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {aiComplexity.isOptimal ? "Optimal" : "Sub-Optimal"}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs">{aiComplexity.explanation}</p>
                  {aiComplexity.optimizationTip && (
                    <div className="bg-indigo-50/50 p-2 rounded border border-indigo-100 text-[11px] text-indigo-900">
                      💡 <strong>Optimization Tip:</strong> {aiComplexity.optimizationTip}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Check if your algorithm achieves optimal Big-O bounds.
                </p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT PANEL */}
      <div className="md:w-1/2 flex flex-col p-6 overflow-y-auto">
        {/* Language + buttons */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex gap-3">
            {languageOptions.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1 rounded text-sm border ${
                  language === lang
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("ai-copilot")}
              className="px-3 py-2 rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Open AI Copilot for Hints, Bug Diagnosis & Complexity"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Copilot</span>
            </button>

            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              className={`px-4 py-2 rounded text-white flex items-center gap-2 font-medium transition-all ${
                isRunning
                  ? "bg-blue-500/80 cursor-not-allowed"
                  : isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm"
              }`}
            >
              {isRunning && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isRunning ? "Running..." : "Run Code"}</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isRunning}
              className={`px-4 py-2 rounded text-white flex items-center gap-2 font-medium transition-all ${
                isSubmitting
                  ? "bg-green-500/80 cursor-not-allowed"
                  : isRunning
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 active:scale-95 shadow-sm"
              }`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
            </button>
          </div>
        </div>


        {/* Monaco Editor */}
        <div className="rounded overflow-hidden border border-gray-300">
          <Editor
            height="50vh"
            theme="vs-dark"
            language={
              language === "c++"
                ? "cpp"
                : language === "javascript"
                ? "javascript"
                : "java"
            }
            value={code}
            onChange={(value) => setCode(value)}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
            }}
            // onMount={handleEditorDidMount}
          />
        </div>

        {/* Bottom Section: Test Cases & Execution Results */}
        <div className="mt-6">
          {/* LeetCode-style Console Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
            <button
              onClick={() => setBottomTab("testcase")}
              className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 -mb-[1px] ${
                bottomTab === "testcase"
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              <span>Test Cases</span>
            </button>

            <button
              onClick={() => setBottomTab("testresult")}
              className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 -mb-[1px] ${
                bottomTab === "testresult"
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Terminal className="w-4 h-4 text-gray-400" />
              <span>Test Result</span>
              {runResult && (
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    runResult.status === "accepted" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              )}
            </button>

            {(submissionResult || isSubmitting) && (
              <button
                onClick={() => setBottomTab("submission")}
                className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 -mb-[1px] ${
                  bottomTab === "submission"
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span>Submission Result</span>
                {submissionResult && (
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      submissionResult.status === "accepted"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {submissionResult.status}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* TAB 1: TEST CASES */}
          {bottomTab === "testcase" && (
            <div>
              {problem.visibleTestCases?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {problem.visibleTestCases.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTestCase(i)}
                      className={`px-3 py-1.5 rounded text-sm font-medium border transition-all ${
                        activeTestCase === i
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Case {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {problem.visibleTestCases?.[activeTestCase] && (() => {
                const t = problem.visibleTestCases[activeTestCase];
                return (
                  <div className="border border-gray-200 bg-white rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                        Input
                      </label>
                      <pre className="font-mono text-xs text-gray-800 bg-gray-100 rounded p-2.5 border border-gray-200 overflow-x-auto whitespace-pre-wrap">
                        {String(t.input)}
                      </pre>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                        Expected Output
                      </label>
                      <pre className="font-mono text-xs text-gray-800 bg-gray-100 rounded p-2.5 border border-gray-200 overflow-x-auto whitespace-pre-wrap">
                        {String(t.output)}
                      </pre>
                    </div>

                    {t.explanation && (
                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                        <span className="font-semibold text-gray-700">Explanation: </span>
                        {t.explanation}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: TEST RESULT */}
          {bottomTab === "testresult" && (
            <div>
              {/* Circular Loader during Run */}
              {isRunning && (
                <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Running against sample test cases...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Compiling and executing code in sandbox...
                    </p>
                  </div>
                </div>
              )}

              {/* Empty state before running */}
              {!isRunning && !runResult && !output && (
                <div className="bg-white border border-gray-200 p-8 rounded-lg text-center">
                  <p className="text-sm text-gray-500 mb-3">
                    You have not run the code yet. Click &quot;Run Code&quot; to test your solution.
                  </p>
                  <button
                    onClick={handleRunCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    Run Code
                  </button>
                </div>
              )}

              {/* Compilation Error Alert */}
              {!isRunning && runResult?.compilationError && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-sm mb-4">
                  <div className="flex items-center gap-2 mb-2 font-bold text-red-700">
                    <Bug className="w-4 h-4 text-red-600" />
                    <span>Compilation Error</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-red-950 p-3 font-mono text-xs text-red-200">
                    {runResult.compilationError}
                  </pre>
                </div>
              )}

              {/* Test Result Content */}
              {!isRunning && runResult && (
                <div className="space-y-4">
                  {/* Status & Stats Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 p-3.5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          runResult.status === "accepted"
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-red-100 text-red-700 border border-red-300"
                        }`}
                      >
                        {runResult.status === "accepted" ? "Accepted" : "Wrong Answer"}
                      </span>
                      <span className="text-xs text-gray-600">
                        Passed: <strong>{runResult.testCasesPassed ?? 0}/{runResult.testCasesTotal ?? problem.visibleTestCases.length}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Runtime: <strong className="text-gray-800">{runResult.runtime ?? 0}s</strong></span>
                      <span>Memory: <strong className="text-gray-800">{runResult.memory ?? 0}KB</strong></span>
                    </div>
                  </div>

                  {/* Test case buttons with pass/fail dots */}
                  {problem.visibleTestCases?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {problem.visibleTestCases.map((_, i) => {
                        const hasRun = testCaseResults.length > i;
                        const isPassed = hasRun && testCaseResults[i] === true;
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveTestCase(i)}
                            className={`px-3 py-1.5 rounded text-sm font-medium border flex items-center gap-2 transition-all ${
                              activeTestCase === i
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <span>Case {i + 1}</span>
                            {hasRun && (
                              <span
                                className={`inline-block w-2.5 h-2.5 rounded-full ${
                                  isPassed ? "bg-green-400" : "bg-red-400"
                                }`}
                                title={isPassed ? "Passed" : "Failed"}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Case Details */}
                  {problem.visibleTestCases?.[activeTestCase] && (() => {
                    const t = problem.visibleTestCases[activeTestCase];
                    const currentRunDetail = runResult?.testCaseDetails?.[activeTestCase];
                    const isPassed =
                      testCaseResults.length > activeTestCase &&
                      testCaseResults[activeTestCase] === true;

                    return (
                      <div
                        className={`border rounded-lg p-4 space-y-3 transition-colors ${
                          isPassed
                            ? "bg-green-50/40 border-green-300"
                            : "bg-red-50/40 border-red-300"
                        }`}
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <span className="font-semibold text-sm text-gray-800">
                            Case {activeTestCase + 1} Result
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              isPassed
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : "bg-red-100 text-red-700 border border-red-300"
                            }`}
                          >
                            {isPassed ? "Passed" : "Wrong Answer"}
                          </span>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                            Input
                          </label>
                          <pre className="font-mono text-xs text-gray-800 bg-gray-100 rounded p-2.5 border border-gray-200 overflow-x-auto whitespace-pre-wrap">
                            {String(t.input)}
                          </pre>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                            Your Output
                          </label>
                          <pre
                            className={`font-mono text-xs rounded p-2.5 border overflow-x-auto whitespace-pre-wrap ${
                              isPassed
                                ? "bg-green-100/70 text-green-950 border-green-300"
                                : "bg-red-100/70 text-red-950 border-red-300"
                            }`}
                          >
                            {currentRunDetail?.actualOutput !== "" && currentRunDetail?.actualOutput !== undefined
                              ? currentRunDetail.actualOutput
                              : "(No output produced)"}
                          </pre>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                            Expected Output
                          </label>
                          <pre className="font-mono text-xs text-gray-800 bg-gray-100 rounded p-2.5 border border-gray-200 overflow-x-auto whitespace-pre-wrap">
                            {String(t.output)}
                          </pre>
                        </div>

                        {currentRunDetail?.error && currentRunDetail.error !== "Wrong Answer" && (
                          <div>
                            <label className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">
                              Diagnostic / Error
                            </label>
                            <pre className="font-mono text-xs bg-red-100 text-red-800 rounded p-2.5 border border-red-300 overflow-x-auto whitespace-pre-wrap">
                              {currentRunDetail.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Standard output logs */}
                  {output && (
                    <div className="mt-4 bg-white border border-gray-300 p-4 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Console / Logs
                        </h4>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                        {output}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBMISSION RESULT */}
          {bottomTab === "submission" && (
            <div>
              {/* Circular Loader during Submit */}
              {isSubmitting && (
                <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-9 h-9 animate-spin text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Submitting and evaluating code...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Evaluating against hidden and visible test cases...
                    </p>
                  </div>
                </div>
              )}

              {/* Submission Result Content */}
              {!isSubmitting && submissionResult && (
                <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                    <h4 className="text-md font-semibold text-black">
                      Submission Result
                    </h4>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        submissionResult.status === "accepted"
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-red-100 text-red-700 border border-red-300"
                      }`}
                    >
                      {submissionResult.status}
                    </span>
                  </div>

                  {submissionResult.errorMessage && (
                    <p className="text-sm font-semibold text-red-600 mt-2">
                      {submissionResult.errorMessage}
                    </p>
                  )}

                  {submissionResult.failedTestCase && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-sm space-y-2">
                      <p className="font-bold text-red-700">
                        Failed Hidden Test Case #{submissionResult.failedTestCase.index}
                      </p>
                      <div>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                          Input
                        </span>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-white p-2.5 font-mono text-xs text-gray-800 border border-gray-200">
                          {submissionResult.failedTestCase.input}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                          Expected Output
                        </span>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-white p-2.5 font-mono text-xs text-gray-800 border border-gray-200">
                          {submissionResult.failedTestCase.expectedOutput}
                        </pre>
                      </div>
                      {submissionResult.failedTestCase.actualOutput !== null &&
                        submissionResult.failedTestCase.actualOutput !== undefined && (
                          <div>
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                              Your Output
                            </span>
                            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-red-100/70 p-2.5 font-mono text-xs text-red-950 border border-red-300">
                              {submissionResult.failedTestCase.actualOutput !== ""
                                ? submissionResult.failedTestCase.actualOutput
                                : "(No output produced)"}
                            </pre>
                          </div>
                        )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-gray-700 pt-3 border-t border-gray-100">
                    <p>
                      <span className="text-gray-500">Runtime:</span>{" "}
                      <span className="font-semibold text-gray-900">{submissionResult.runtime ?? "-"} sec</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Memory:</span>{" "}
                      <span className="font-semibold text-gray-900">{submissionResult.memory ?? "-"} KB</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Test Cases Passed:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {submissionResult.testCasesPassed ?? 0}/
                        {submissionResult.testCasesTotal ?? problem.visibleTestCases.length}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}