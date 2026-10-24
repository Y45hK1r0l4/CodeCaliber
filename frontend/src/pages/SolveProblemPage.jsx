import React, { useEffect, useRef, useState } from "react";
import { useParams, NavLink } from "react-router";
import { useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import { axiosClient } from "../utils/axiosClient";
import { ensureCppHeader } from "../utils/codeUtils";
import Toast from "../components/Toaster";
import { Sparkles, Lightbulb, Bug, Gauge, Loader2, CheckCircle2, ChevronRight, Pencil, Terminal, ArrowLeft } from "lucide-react";

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
  const [bottomTab, setBottomTab] = useState("testcase"); // 'testcase' | 'testresult' | 'submission'
  const [testCaseResults, setTestCaseResults] = useState([]); // array of booleans: true = passed
  const [hasAccepted, setHasAccepted] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);
  const [toast, setToast] = useState(null);

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
    <div className="solve-page min-h-screen flex flex-col md:flex-row relative">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* LEFT PANEL */}
      <div className="md:w-1/2 border-r border-zinc-800 p-6 overflow-y-auto bg-zinc-950">
        {["admin", "evaluator"].includes(user?.role) && (
          <div className="mb-4 pb-2 border-b border-zinc-900">
            <NavLink
              to="/admin/problems"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Question Library</span>
            </NavLink>
          </div>
        )}
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
                  ? "bg-zinc-900 text-white border-zinc-700 shadow-sm"
                  : tab === "solution" && !hasAccepted
                  ? "text-zinc-600 border-zinc-800 cursor-not-allowed bg-zinc-950"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900/50 hover:text-zinc-200"
              }`}
            >
              {tab === "ai-copilot" ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>AI Copilot</span>
                  {hintsList.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-zinc-800 text-zinc-300 text-[10px] rounded-full border border-zinc-700 font-mono">
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
            <div className="flex items-center justify-between mb-4 gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{problem.title}</h1>
              {["admin", "evaluator"].includes(user?.role) && (
                <NavLink
                  to={`/admin/editProblem/${problem._id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 rounded-lg transition shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Problem
                </NavLink>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border capitalize ${
                  problem.difficultyLevel === "easy"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : problem.difficultyLevel === "medium"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {problem.difficultyLevel}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Tags: {Array.isArray(problem.tags) ? problem.tags.join(", ") : String(problem.tags || "")}
              </span>
            </div>

            <div className="text-zinc-300 whitespace-pre-line leading-relaxed text-sm bg-zinc-900/50 p-4 rounded-xl border border-zinc-850">
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

            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mt-6 mb-3 font-mono">
              Visible Test Cases
            </h3>

            <div className="space-y-3">
              {problem.visibleTestCases?.map((t, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/40 border border-zinc-800 p-3.5 rounded-lg text-xs"
                >
                  <div className="mb-2">
                    <span className="text-zinc-400 font-mono text-[11px] uppercase block mb-1">Input</span>
                    <div className="font-mono text-zinc-200 bg-zinc-950 border border-zinc-850 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                      {String(t.input)}
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-zinc-400 font-mono text-[11px] uppercase block mb-1">Expected Output</span>
                    <div className="font-mono text-zinc-200 bg-zinc-950 border border-zinc-850 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                      {String(t.output)}
                    </div>
                  </div>

                  {t.explanation && (
                    <p className="text-[11px] text-zinc-400 italic mt-1 border-t border-zinc-800/80 pt-1.5">{t.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submissions */}
        {activeTab === "submissions" && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-4">
              Submission History
            </h2>

            {loadingSubmissions ? (
              <p className="text-gray-500">Loading submissions...</p>
            ) : submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission._id}
                    onClick={() => handleViewSubmission(submission)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedSubmission?._id === submission._id
                        ? "border-zinc-500 bg-zinc-900"
                        : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-mono font-medium rounded border ${
                          submission.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : submission.status === "runtime error"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {submission.status.toUpperCase()}
                      </span>

                      <p className="text-xs text-zinc-500 font-mono">
                        {new Date(submission.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <div>
                        <span>Runtime: <strong className="text-zinc-200">{submission.runtime}s</strong></span>
                        <span className="mx-2">·</span>
                        <span>Memory: <strong className="text-zinc-200">{submission.memory}KB</strong></span>
                      </div>

                      <div className="text-zinc-400 uppercase">
                        {submission.language || "C++"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-zinc-400 text-sm mb-1">
                  No submissions recorded for this challenge yet.
                </p>
                <p className="text-zinc-600 text-xs">
                  Run or submit your solution to inspect historical benchmarks.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Solution */}
        {activeTab === "solution" && hasAccepted && (
          <div>
            <h2 className="text-base font-bold text-white mb-3">
              Official Reference Implementation
            </h2>
            <pre className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg text-xs font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
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
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 p-5 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-300" />
                <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">AI Socratic Copilot</h2>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Autonomous pedagogical assistant. Get progressive hints without code spoilers, diagnose test failures, and verify Big-O time and space complexity.
              </p>
            </div>

            {/* ACTION 1: SOCRATIC HINTS */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-zinc-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                    Socratic Hints ({hintsList.length}/3)
                  </h3>
                </div>
                <button
                  onClick={handleGetAiHint}
                  disabled={loadingHint || hintCount >= 3}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-zinc-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                    Time & Space Complexity Verifier
                  </h3>
                </div>
                <button
                  onClick={handleAnalyzeComplexity}
                  disabled={loadingComplexity || !code}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 border border-zinc-700 shadow-sm transition-all cursor-pointer"
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
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex items-center gap-4 font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Time Complexity</span>
                      <span className="font-bold text-zinc-200 text-sm">{aiComplexity.timeComplexity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Space Complexity</span>
                      <span className="font-bold text-zinc-200 text-sm">{aiComplexity.spaceComplexity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Efficiency</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${aiComplexity.isOptimal ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                        {aiComplexity.isOptimal ? "Optimal" : "Sub-Optimal"}
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed">{aiComplexity.explanation}</p>
                  {aiComplexity.optimizationTip && (
                    <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Optimization Recommendation:</strong> {aiComplexity.optimizationTip}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  Check if your algorithm achieves optimal Big-O bounds.
                </p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT PANEL */}
      <div className="md:w-1/2 flex flex-col p-6 overflow-y-auto bg-zinc-950">
        {/* Language + buttons */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex gap-2">
            {languageOptions.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                  language === lang
                    ? "bg-zinc-800 text-white border-zinc-600 shadow-sm"
                    : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-900"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("ai-copilot")}
              className="px-3 py-1.5 rounded-lg text-zinc-300 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Open AI Copilot for Hints, Bug Diagnosis & Complexity"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>AI Copilot</span>
            </button>

            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              className={`px-4 py-1.5 rounded-lg text-zinc-200 flex items-center gap-2 font-medium text-xs transition-all border cursor-pointer ${
                isRunning
                  ? "bg-zinc-900 border-zinc-800 opacity-60 cursor-not-allowed"
                  : isSubmitting
                  ? "bg-zinc-900 border-zinc-800 opacity-60 cursor-not-allowed"
                  : "bg-zinc-800 hover:bg-zinc-700 hover:text-white border-zinc-700 active:scale-95 shadow-sm"
              }`}
            >
              {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isRunning ? "Running..." : "Run Code"}</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isRunning}
              className={`px-4 py-1.5 rounded-lg text-zinc-950 bg-white hover:bg-zinc-200 flex items-center gap-2 font-bold text-xs transition-all shadow-md cursor-pointer ${
                isSubmitting || isRunning ? "opacity-60 cursor-not-allowed" : "active:scale-95"
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? "Submitting..." : "Submit Code"}</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-xl">
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
            onMount={handleEditorDidMount}
          />
        </div>

        {/* Bottom Section: Test Cases & Execution Results */}
        <div className="mt-6">
          {/* LeetCode-style Console Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
            <button
              onClick={() => setBottomTab("testcase")}
              className={`px-4 py-2 text-xs font-mono font-semibold flex items-center gap-2 transition-all border-b-2 -mb-[1px] cursor-pointer ${
                bottomTab === "testcase"
                  ? "border-zinc-200 text-white bg-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Test Cases</span>
            </button>

            <button
              onClick={() => setBottomTab("testresult")}
              className={`px-4 py-2 text-xs font-mono font-semibold flex items-center gap-2 transition-all border-b-2 -mb-[1px] cursor-pointer ${
                bottomTab === "testresult"
                  ? "border-zinc-200 text-white bg-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Test Result</span>
              {runResult && (
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    runResult.status === "accepted" ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
              )}
            </button>

            {(submissionResult || isSubmitting) && (
              <button
                onClick={() => setBottomTab("submission")}
                className={`px-4 py-2 text-xs font-mono font-semibold flex items-center gap-2 transition-all border-b-2 -mb-[1px] cursor-pointer ${
                  bottomTab === "submission"
                    ? "border-zinc-200 text-white bg-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                }`}
              >
                <span>Submission Result</span>
                {submissionResult && (
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                      submissionResult.status === "accepted"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
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
                      className={`px-3 py-1 rounded text-xs font-mono font-medium border transition-all cursor-pointer ${
                        activeTestCase === i
                          ? "bg-zinc-800 text-white border-zinc-600 shadow-sm"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200"
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
                  <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                        Input
                      </label>
                      <pre className="font-mono text-xs text-zinc-200 bg-zinc-950 rounded p-2.5 border border-zinc-850 overflow-x-auto whitespace-pre-wrap">
                        {String(t.input)}
                      </pre>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                        Expected Output
                      </label>
                      <pre className="font-mono text-xs text-zinc-200 bg-zinc-950 rounded p-2.5 border border-zinc-850 overflow-x-auto whitespace-pre-wrap">
                        {String(t.output)}
                      </pre>
                    </div>

                    {t.explanation && (
                      <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800 italic">
                        <span className="font-semibold text-zinc-300 not-italic">Explanation: </span>
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
                <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-xl shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Running against sample test cases...
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">
                      Compiling and executing code in sandboxed codebox...
                    </p>
                  </div>
                </div>
              )}

              {/* Empty state before running */}
              {!isRunning && !runResult && !output && (
                <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-xl text-center">
                  <p className="text-sm text-zinc-400 mb-3">
                    No run executed yet. Click &quot;Run Code&quot; to test against sample test cases.
                  </p>
                  <button
                    onClick={handleRunCode}
                    className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-xs font-semibold hover:bg-zinc-700 border border-zinc-700 shadow-sm cursor-pointer"
                  >
                    Run Code
                  </button>
                </div>
              )}

              {/* Compilation Error Alert */}
              {!isRunning && runResult?.compilationError && (
                <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-sm text-rose-200 shadow-sm mb-4">
                  <div className="flex items-center gap-2 mb-2 font-bold text-rose-300 font-mono">
                    <Bug className="w-4 h-4 text-rose-400" />
                    <span>Compilation Error</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 font-mono text-xs text-rose-300 border border-rose-900/50">
                    {runResult.compilationError}
                  </pre>
                </div>
              )}

              {/* Test Result Content */}
              {!isRunning && runResult && (
                <div className="space-y-4">
                  {/* Status & Stats Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl font-mono text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                          runResult.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {runResult.status === "accepted" ? "Accepted" : "Wrong Answer"}
                      </span>
                      <span className="text-zinc-400">
                        Passed: <strong className="text-white">{runResult.testCasesPassed ?? 0}/{runResult.testCasesTotal ?? problem.visibleTestCases.length}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-zinc-400">
                      <span>Runtime: <strong className="text-zinc-200">{runResult.runtime ?? 0}s</strong></span>
                      <span>Memory: <strong className="text-zinc-200">{runResult.memory ?? 0}KB</strong></span>
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
                            className={`px-3 py-1 rounded text-xs font-mono font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                              activeTestCase === i
                                ? "bg-zinc-800 text-white border-zinc-600 shadow-sm"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200"
                            }`}
                          >
                            <span>Case {i + 1}</span>
                            {hasRun && (
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${
                                  isPassed ? "bg-emerald-400" : "bg-rose-400"
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
                        className={`border rounded-xl p-4 space-y-3 transition-colors ${
                          isPassed
                            ? "bg-emerald-950/20 border-emerald-900/50"
                            : "bg-rose-950/20 border-rose-900/50"
                        }`}
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80 font-mono text-xs">
                          <span className="font-semibold text-zinc-200">
                            Case {activeTestCase + 1} Result
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              isPassed
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {isPassed ? "Passed" : "Wrong Answer"}
                          </span>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                            Input
                          </label>
                          <pre className="font-mono text-xs text-zinc-200 bg-zinc-950 rounded p-2.5 border border-zinc-850 overflow-x-auto whitespace-pre-wrap">
                            {String(t.input)}
                          </pre>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                            Your Output
                          </label>
                          <pre
                            className={`font-mono text-xs rounded p-2.5 border overflow-x-auto whitespace-pre-wrap ${
                              isPassed
                                ? "bg-zinc-950 text-emerald-300 border-emerald-900/50"
                                : "bg-zinc-950 text-rose-300 border-rose-900/50"
                            }`}
                          >
                            {currentRunDetail?.actualOutput !== "" && currentRunDetail?.actualOutput !== undefined
                              ? currentRunDetail.actualOutput
                              : "(No output produced)"}
                          </pre>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                            Expected Output
                          </label>
                          <pre className="font-mono text-xs text-zinc-200 bg-zinc-950 rounded p-2.5 border border-zinc-850 overflow-x-auto whitespace-pre-wrap">
                            {String(t.output)}
                          </pre>
                        </div>

                        {currentRunDetail?.error && currentRunDetail.error !== "Wrong Answer" && (
                          <div>
                            <label className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-1 font-mono">
                              Diagnostic / Error
                            </label>
                            <pre className="font-mono text-xs bg-rose-950/60 text-rose-300 rounded p-2.5 border border-rose-800/60 overflow-x-auto whitespace-pre-wrap">
                              {currentRunDetail.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Standard output logs */}
                  {output && (
                    <div className="mt-4 bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                          Console / Telemetry Logs
                        </h4>
                      </div>
                      <pre className="bg-zinc-950 text-zinc-300 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-zinc-850">
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
                <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-xl shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Submitting and benchmarking code...
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">
                      Evaluating against hidden and visible test suites in sandbox...
                    </p>
                  </div>
                </div>
              )}

              {/* Submission Result Content */}
              {!isSubmitting && submissionResult && (
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-800 font-mono text-xs">
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                      Submission Verdict
                    </h4>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                        submissionResult.status === "accepted"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {submissionResult.status}
                    </span>
                  </div>

                  {submissionResult.errorMessage && (
                    <p className="text-xs font-mono text-rose-400 mt-2 bg-rose-950/40 p-2.5 rounded border border-rose-900/50">
                      {submissionResult.errorMessage}
                    </p>
                  )}

                  {submissionResult.failedTestCase && (
                    <div className="mt-3 rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 text-xs font-mono space-y-2.5">
                      <p className="font-bold text-rose-300">
                        Failed Hidden Test Case #{submissionResult.failedTestCase.index}
                      </p>
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Input
                        </span>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-2.5 text-zinc-200 border border-zinc-850">
                          {submissionResult.failedTestCase.input}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Expected Output
                        </span>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-2.5 text-zinc-200 border border-zinc-850">
                          {submissionResult.failedTestCase.expectedOutput}
                        </pre>
                      </div>
                      {submissionResult.failedTestCase.actualOutput !== null &&
                        submissionResult.failedTestCase.actualOutput !== undefined && (
                          <div>
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                              Your Output
                            </span>
                            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-2.5 text-rose-300 border border-rose-900/50">
                              {submissionResult.failedTestCase.actualOutput !== ""
                                ? submissionResult.failedTestCase.actualOutput
                                : "(No output produced)"}
                            </pre>
                          </div>
                        )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-5 text-xs font-mono text-zinc-400 pt-3 border-t border-zinc-800">
                    <p>
                      <span>Runtime:</span>{" "}
                      <span className="font-semibold text-zinc-200">{submissionResult.runtime ?? "-"}s</span>
                    </p>
                    <p>
                      <span>Memory:</span>{" "}
                      <span className="font-semibold text-zinc-200">{submissionResult.memory ?? "-"}KB</span>
                    </p>
                    <p>
                      <span>Tests Passed:</span>{" "}
                      <span className="font-semibold text-zinc-200">
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