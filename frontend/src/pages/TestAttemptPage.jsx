import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, NavLink } from "react-router";
import { useSelector } from "react-redux";
import { 
  Clock3, 
  Send, 
  ShieldCheck, 
  ShieldAlert,
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Code2,
  Maximize2,
  Lock,
  FileText,
  AlertCircle,
  Users,
  Sparkles,
  Siren
} from "lucide-react";
import { axiosClient } from "../utils/axiosClient";

const DEFAULT_STARTER = {
  "c++": `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
  "java": `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`,
  "javascript": `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8');\n\n// Write your code here\n`
};

export default function TestAttemptPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isStaff = ["admin", "evaluator"].includes(user?.role);

  // If staff/evaluator opens test attempt page, redirect to the performance analytics page
  useEffect(() => {
    if (isStaff && testId) {
      navigate(`/admin/test/${testId}/performance`, { replace: true });
    }
  }, [isStaff, testId, navigate]);

  // Phase: "loading" | "preview" | "testing" | "completed"
  const [phase, setPhase] = useState("loading");
  const [preview, setPreview] = useState(null);
  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [language, setLanguage] = useState("c++");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Anti-cheat & integrity state
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [integrityStatus, setIntegrityStatus] = useState("clean");
  const [violationBanner, setViolationBanner] = useState("");
  const attemptRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const lastSavedCodeRef = useRef({});

  // Code execution & submission states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [autoSubmittedNotice, setAutoSubmittedNotice] = useState(false);

  // Optional AI Hints (when enabled by educator)
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintsList, setHintsList] = useState({});
  const [hintCount, setHintCount] = useState({});

  const handleGetAiHint = async (q, currentCode) => {
    if (!q) return;
    const qId = String(q._id);
    const count = hintCount[qId] || 0;
    if (count >= 3) return;
    try {
      setLoadingHint(true);
      const nextNum = count + 1;
      const res = await axiosClient.post("/problem/ai-hint", {
        problemId: q._id,
        title: q.title,
        description: q.description,
        code: currentCode || "",
        userCode: currentCode || "",
        language,
        hintNumber: nextNum,
      });
      if (res.data?.hint) {
        setHintsList((prev) => ({
          ...prev,
          [qId]: [...(prev[qId] || []), { number: nextNum, text: res.data.hint }]
        }));
        setHintCount((prev) => ({ ...prev, [qId]: nextNum }));
      }
    } catch (err) {
      console.error("AI hint error:", err);
    } finally {
      setLoadingHint(false);
    }
  };

  // Keep attemptRef updated for event listeners
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  // Request Fullscreen helper
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn("Fullscreen request failed:", err);
    }
  };

  // 1. Initial Load: Fetch Preview and Check Status
  useEffect(() => {
    axiosClient.get(`/tests/${testId}/preview`)
      .then(({ data }) => {
        setPreview(data);

        // If user already submitted or expired, show completed directly
        if (data.existingAttempt && (data.existingAttempt.status === "submitted" || data.existingAttempt.status === "expired")) {
          setAttempt(data.existingAttempt);
          setIntegrityStatus(data.existingAttempt.integrityStatus || "clean");
          setViolations((data.existingAttempt.tabSwitches || 0) + (data.existingAttempt.fullscreenExits || 0));
          setPhase("completed");
        } else {
          // Always show Preview / Rules first with the Start button!
          setPhase("preview");
        }
      })
      .catch((error) => {
        setMessage(error.response?.data?.message || "Unable to access this assessment.");
        setPhase("preview");
      });
  }, [testId]);

  // 2. Start Test Call
  const startActualTest = async () => {
    try {
      setMessage("");
      const { data } = await axiosClient.post(`/tests/${testId}/start`);

      // If attempt is already completed/auto-submitted, show completed summary directly
      if (data.completed || data.attempt?.status === "submitted" || data.attempt?.status === "expired") {
        setTest(data.test);
        setAttempt(data.attempt);
        setIntegrityStatus(data.attempt?.integrityStatus || "clean");
        setViolations((data.attempt?.tabSwitches || 0) + (data.attempt?.fullscreenExits || 0));
        if (data.autoSubmitted) {
          setAutoSubmittedNotice(true);
        }
        setPhase("completed");
        return;
      }

      setTest(data.test);
      setAttempt(data.attempt);
      setExpiresAt(new Date(data.expiresAt).getTime());
      setViolations((data.attempt.tabSwitches || 0) + (data.attempt.fullscreenExits || 0));
      setIntegrityStatus(data.attempt.integrityStatus || "clean");

      const initialAnswers = {};
      data.attempt.answers?.forEach((ans) => {
        if (ans.code) {
          initialAnswers[ans.question] = ans.code;
        }
      });

      // Initialize starter code for questions that don't have code yet
      (data.test.questions || []).forEach((q) => {
        if (!initialAnswers[q._id]) {
          const starter = q.startCode?.find((sc) => sc.language?.toLowerCase() === "c++")?.code;
          initialAnswers[q._id] = starter || DEFAULT_STARTER["c++"];
        }
      });

      setAnswers(initialAnswers);
      lastSavedCodeRef.current = { ...initialAnswers };
      setPhase("testing");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to start the assessment.");
    }
  };

  // Clock tick every second
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Report Integrity Violation
  const reportViolation = useCallback((type, alertText) => {
    const currentAttemptId = attemptRef.current?._id;
    if (!currentAttemptId) return;

    const currentTime = Date.now();
    if (currentTime - lastViolationTimeRef.current < 2500) return; // Debounce rapid triggers
    lastViolationTimeRef.current = currentTime;

    setViolationBanner(alertText);
    setViolations((prev) => prev + 1);

    axiosClient.post(`/tests/attempts/${currentAttemptId}/integrity`, { type })
      .then(({ data }) => {
        if (data.integrityStatus) setIntegrityStatus(data.integrityStatus);
      })
      .catch(() => {});
  }, []);

  // Anti-Cheat Event Listeners in "testing" phase
  useEffect(() => {
    if (phase !== "testing") return;

    const checkIsFullscreen = () => {
      const isFull = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFull);
      return isFull;
    };

    // Perform check immediately when testing phase begins
    checkIsFullscreen();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation("tab_switch", "⚠️ Tab switch detected! This incident has been logged and reported to your instructor.");
      }
    };

    const handleBlur = () => {
      reportViolation("tab_switch", "⚠️ Browser window lost focus! This incident has been logged for instructor review.");
    };

    const handleFullscreenChange = () => {
      const isFull = checkIsFullscreen();
      if (!isFull) {
        reportViolation("fullscreen_exit", "⚠️ Fullscreen exited! Please return to fullscreen mode immediately.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [phase, reportViolation]);

  // Seconds calculation for test countdown
  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;
  const timeLabel = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [secondsLeft]);

  // Seconds calculation for upcoming test start countdown
  const startsAtTime = preview?.test?.startsAt ? new Date(preview.test.startsAt).getTime() : null;
  const endsAtTime = preview?.test?.endsAt ? new Date(preview.test.endsAt).getTime() : null;
  const isUpcoming = startsAtTime ? now < startsAtTime : false;
  const isClosed = endsAtTime ? now > endsAtTime : false;
  const canStartTest = !isUpcoming && !isClosed;

  const secondsUntilStart = startsAtTime ? Math.max(0, Math.floor((startsAtTime - now) / 1000)) : 0;
  const countdownUntilStartLabel = useMemo(() => {
    if (secondsUntilStart <= 0) return "00:00:00";
    const hours = Math.floor(secondsUntilStart / 3600);
    const mins = Math.floor((secondsUntilStart % 3600) / 60);
    const secs = secondsUntilStart % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [secondsUntilStart]);

  const question = test?.questions?.[activeQuestion];

  // Finish test (supports manual finish and timer auto-finish)
  const finishTest = useCallback(async (isAuto = false) => {
    if (!attempt || isFinishing) return;
    try {
      setIsFinishing(true);
      setShowConfirmFinish(false);

      const currentQ = test?.questions?.[activeQuestion];
      const currentCode = currentQ ? answers[currentQ._id] : undefined;

      const { data } = await axiosClient.post(`/tests/attempts/${attempt._id}/submit`, {
        currentQuestion: currentQ?._id,
        currentCode,
        language,
        autoSubmitted: isAuto,
      });

      setAttempt(data.attempt);
      setIntegrityStatus(data.attempt?.integrityStatus || integrityStatus);
      if (isAuto) {
        setAutoSubmittedNotice(true);
      }
      setPhase("completed");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit test.");
      setIsFinishing(false);
    }
  }, [attempt, isFinishing, test, activeQuestion, answers, language, integrityStatus]);

  useEffect(() => {
    if (expiresAt && secondsLeft <= 0 && attempt?.status === "in_progress") {
      finishTest(true);
    }
  }, [expiresAt, secondsLeft, attempt?.status, finishTest]);

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (question) {
      const currentCode = answers[question._id];
      const isDefault = Object.values(DEFAULT_STARTER).includes(currentCode);
      if (!currentCode || isDefault) {
        const found = question.startCode?.find((sc) => sc.language?.toLowerCase() === newLang.toLowerCase())?.code;
        setAnswers({
          ...answers,
          [question._id]: found || DEFAULT_STARTER[newLang] || ""
        });
      }
    }
  };

  // Run code against visible test cases
  const handleRunCode = async () => {
    if (!question) return;
    try {
      setIsRunning(true);
      setRunResult(null);
      setSubmissionResult(null);
      const res = await axiosClient.post(`/submission/run/${question._id}`, {
        code: answers[question._id] || "",
        language
      });
      setRunResult(res.data);
    } catch (error) {
      setRunResult({
        status: "error",
        errorMessage: error.response?.data?.message || error.message || "Execution error"
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Debounced auto-save (saves automatically 2 seconds after user stops typing)
  useEffect(() => {
    if (phase !== "testing" || !attempt?._id || !question?._id) return;

    const currentCode = answers[question._id];
    if (currentCode === undefined) return;
    if (lastSavedCodeRef.current[question._id] === currentCode) return;

    const timer = setTimeout(async () => {
      try {
        setSaveStatus("Auto-saving...");
        await axiosClient.patch(`/tests/attempts/${attempt._id}/answers`, {
          question: question._id,
          code: currentCode,
          language
        });
        lastSavedCodeRef.current[question._id] = currentCode;
        setSaveStatus("Auto-saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch {
        setSaveStatus("Auto-save failed");
        setTimeout(() => setSaveStatus(""), 2500);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [answers, question?._id, attempt?._id, language, phase]);

  // Submit code for grading on hidden test cases
  const handleSubmitQuestion = async () => {
    if (!attempt || !question) return;
    try {
      setIsSubmitting(true);
      setSubmissionResult(null);
      setRunResult(null);
      const res = await axiosClient.post(`/submission/submit/${question._id}`, {
        code: answers[question._id] || "",
        language,
        testAttemptId: attempt._id
      });
      setSubmissionResult(res.data);
      setAttempt((curr) => {
        if (!curr) return curr;
        const updatedAnswers = (curr.answers || []).map((ans) => {
          if (String(ans.question) === String(question._id)) {
            return { ...ans, submission: res.data._id, code: answers[question._id] };
          }
          return ans;
        });
        return { ...curr, answers: updatedAnswers };
      });
    } catch (error) {
      setSubmissionResult({
        status: "error",
        errorMessage: error.response?.data?.message || "Submission failed"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // PHASE: LOADING
  // ==========================================
  if (phase === "loading") {
    return (
      <main className="app-page flex min-h-[calc(100vh-60px)] items-center justify-center text-sm text-black/50">
        Preparing your assessment workspace...
      </main>
    );
  }

  // ==========================================
  // PHASE: COMPLETED (Already Submitted or Expired)
  // ==========================================
  if (phase === "completed") {
    return (
      <main className="app-page flex min-h-[calc(100vh-60px)] items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-[#faf7f1] p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="serif text-3xl font-bold text-black/85">
            {autoSubmittedNotice ? "Assessment Auto-Submitted" : "Assessment Submitted"}
          </h2>
          <p className="mt-2 text-xs text-black/55">
            {autoSubmittedNotice
              ? "Your allocated test time expired. Your current code was automatically recorded, graded, and submitted."
              : "Your solutions have been recorded and sent to your educator for evaluation."}
          </p>

          {autoSubmittedNotice && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
              <Clock3 className="h-3.5 w-3.5 text-amber-700" />
              <span>Concluded by time limit auto-submission</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl border border-black/10 bg-white/60 p-4">
              <span className="text-[10px] uppercase font-semibold text-black/45 tracking-wider">
                {isStaff ? "Score" : "Solved Questions"}
              </span>
              <div className="text-xl font-bold font-mono text-black/85">
                {isStaff ? (
                  <>
                    {attempt?.score ?? 0} / {attempt?.total ?? preview?.test?.totalMarks ?? 0} marks
                    <span className="ml-2 text-xs font-normal text-black/50">
                      ({(attempt?.total || preview?.test?.totalMarks) > 0 ? Math.round(((attempt?.score || 0) / (attempt?.total || preview?.test?.totalMarks)) * 100) : 0}%)
                    </span>
                  </>
                ) : (
                  <>
                    {attempt?.questionsSolved ?? 0} / {attempt?.totalQuestions ?? (preview?.test?.questionCount || test?.questions?.length || 0)}
                    <span className="ml-2 text-xs font-normal text-black/50">
                      problems solved
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white/60 p-4">
              <span className="text-[10px] uppercase font-semibold text-black/45 tracking-wider">Integrity Status</span>
              <div className="mt-1 flex items-center gap-1.5">
                {integrityStatus === "flagged" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                    <ShieldAlert className="h-4 w-4" /> Flagged ({violations} events)
                  </span>
                ) : integrityStatus === "suspicious" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> Suspicious ({violations} events)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Clean (0 flags)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <NavLink
              to="/assessments"
              className="inline-flex items-center gap-2 rounded-full bg-[#bd5b3d] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#a94e34] transition shadow-sm"
            >
              <span>Return to Assessments</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // PHASE: PRE-TEST LOBBY & RULES SCREEN
  // ==========================================
  if (phase === "preview" && preview?.test) {
    const testMeta = preview.test;
    const formatDateTime = (dateStr) => {
      if (!dateStr) return null;
      return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    };

    const handleBeginTest = async () => {
      await enterFullscreen();
      await startActualTest();
    };

    return (
      <main className="app-page px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb back */}
          <div className="mb-6">
            <NavLink
              to="/assessments"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/55 hover:text-black transition"
            >
              ← Back to assessments
            </NavLink>
          </div>

          {message && (
            <div className="mb-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              {message}
            </div>
          )}

          {/* Assessment Header Card */}
          <div className="rounded-2xl border border-black/10 bg-[#faf7f1] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-5">
              <div>
                <span className="text-[11px] uppercase tracking-[.18em] font-semibold text-[#68765d]">
                  Assessment Pre-Test Lobby
                </span>
                <h1 className="serif mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-black/90">
                  {testMeta.title}
                </h1>
                {testMeta.testCode && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-600/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900">
                      Exam Code: {testMeta.testCode}
                    </span>
                  </div>
                )}
                {testMeta.createdBy && (
                  <p className="mt-2 text-xs text-black/60 flex items-center gap-1">
                    <span className="text-black/45">Assessment created by:</span>
                    <NavLink
                      to={`/profile/${testMeta.createdBy._id || testMeta.createdBy}`}
                      className="font-semibold text-black/85 hover:text-[#bd5b3d] hover:underline"
                    >
                      {testMeta.createdBy.firstName} {testMeta.createdBy.lastName}
                    </NavLink>
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div>
                {isUpcoming && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800">
                    <Clock3 className="h-3.5 w-3.5 text-amber-600" />
                    <span>Upcoming Assessment</span>
                  </span>
                )}
                {canStartTest && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Assessment Window Open</span>
                  </span>
                )}
                {isClosed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-500/20 bg-neutral-500/10 px-3 py-1 text-xs font-semibold text-neutral-600">
                    <span>Window Closed</span>
                  </span>
                )}
              </div>
            </div>

            {/* Test Metadata Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-black/5 bg-white/60 p-3.5">
                <span className="text-black/45 block text-[10px] uppercase font-semibold">Duration</span>
                <strong className="text-sm font-bold text-black/80">{testMeta.durationMinutes} mins</strong>
              </div>
              <div className="rounded-xl border border-black/5 bg-white/60 p-3.5">
                <span className="text-black/45 block text-[10px] uppercase font-semibold">Total Evaluation</span>
                <strong className="text-sm font-bold text-black/80">
                  {isStaff 
                    ? `${testMeta.totalMarks || (testMeta.questionCount * 10)} Marks (${testMeta.questionCount} problems)`
                    : `${testMeta.questionCount} problems`}
                </strong>
              </div>
              <div className="rounded-xl border border-black/5 bg-white/60 p-3.5">
                <span className="text-black/45 block text-[10px] uppercase font-semibold">Opens At</span>
                <strong className="text-xs font-medium text-black/80">
                  {testMeta.startsAt ? formatDateTime(testMeta.startsAt) : "Open anytime"}
                </strong>
              </div>
              <div className="rounded-xl border border-black/5 bg-white/60 p-3.5">
                <span className="text-black/45 block text-[10px] uppercase font-semibold">Closes At</span>
                <strong className="text-xs font-medium text-black/80">
                  {testMeta.endsAt ? formatDateTime(testMeta.endsAt) : "No cutoff date"}
                </strong>
              </div>
            </div>

            {/* Evaluator Instructions */}
            {testMeta.instructions && (
              <div className="mt-6 rounded-xl border border-black/10 bg-white/50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black/50 mb-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Assessment Instructions</span>
                </div>
                <p className="text-xs text-black/75 whitespace-pre-wrap leading-relaxed">
                  {testMeta.instructions}
                </p>
              </div>
            )}

            {/* LIVE COUNTDOWN IF UPCOMING */}
            {isUpcoming && (
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-800">
                  Assessment Window Opens In
                </div>
                <div className="mt-2 font-mono text-4xl sm:text-5xl font-black text-amber-900 tracking-wider">
                  {countdownUntilStartLabel}
                </div>
                <p className="mt-2 text-xs text-amber-800/80">
                  Please review the rules and anti-cheat policies below. The start button will automatically unlock as soon as the testing window opens.
                </p>
              </div>
            )}

            {/* ANTI-CHEAT & INTEGRITY POLICIES */}
            <div className="mt-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-sky-700" />
                <h3 className="font-semibold text-sm text-sky-900 uppercase tracking-wide">
                  CodeNest Anti-Cheat & Examination Integrity Protocol
                </h3>
              </div>
              <p className="text-xs text-sky-950/75 leading-relaxed mb-4">
                This timed test is proctored with real-time academic integrity monitoring. All submissions include an automated integrity audit visible to your instructor.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 text-xs text-sky-950/80">
                <div className="rounded-xl border border-sky-500/15 bg-white/60 p-3">
                  <strong className="block text-sky-900 font-semibold mb-1">🖥️ Fullscreen Lockdown</strong>
                  <span>The assessment will request fullscreen mode. Exiting fullscreen or minimizing will be flagged on your audit trail.</span>
                </div>

                <div className="rounded-xl border border-sky-500/15 bg-white/60 p-3">
                  <strong className="block text-sky-900 font-semibold mb-1">👁️ Tab-Switch & Blur Monitoring</strong>
                  <span>Switching browser tabs or shifting focus to another application is actively logged and reported to the educator.</span>
                </div>

                <div className="rounded-xl border border-sky-500/15 bg-white/60 p-3">
                  <strong className="block text-sky-900 font-semibold mb-1">📋 Clipboard Paste Lock</strong>
                  <span>Direct code pasting into the code editor is disabled to ensure original, authentic problem solving.</span>
                </div>

                <div className="rounded-xl border border-sky-500/15 bg-white/60 p-3">
                  <strong className="block text-sky-900 font-semibold mb-1">⏱️ Hard Server Timer</strong>
                  <span>Your attempt timer runs continuously on the server. Your code is auto-submitted immediately upon expiration.</span>
                </div>
              </div>
            </div>

            {/* Honor Code Pledge */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-black/10 bg-white/70 p-4">
              <input
                type="checkbox"
                id="honorCode"
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#bd5b3d] focus:ring-[#bd5b3d] cursor-pointer"
              />
              <label htmlFor="honorCode" className="text-xs text-black/75 cursor-pointer select-none leading-relaxed">
                <strong className="font-semibold text-black/90">Assessment Integrity Pledge:</strong> I confirm that I am the registered participant taking this assessment. I agree not to use unauthorized aids, external browser tabs, chat rooms, or AI code generators during this test.
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-black/10">
              <div className="text-xs text-black/45">
                {isUpcoming ? (
                  <span>Countdown active · Button enables once window opens</span>
                ) : isClosed ? (
                  <span className="text-rose-700 font-medium">This assessment window is closed.</span>
                ) : (
                  <span>Ensure your browser allows fullscreen prompts before starting.</span>
                )}
              </div>

              <button
                onClick={handleBeginTest}
                disabled={!canStartTest || !agreedToRules}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold text-white transition shadow-sm ${
                  canStartTest && agreedToRules
                    ? "bg-[#bd5b3d] hover:bg-[#a94e34] cursor-pointer"
                    : "bg-black/20 cursor-not-allowed"
                }`}
              >
                <Maximize2 className="h-4 w-4" />
                <span>
                  {isUpcoming
                    ? "Test Not Started Yet"
                    : isClosed
                    ? "Assessment Closed"
                    : !agreedToRules
                    ? "Agree to Pledge to Start"
                    : preview?.existingAttempt?.status === "in_progress"
                    ? "Enter Fullscreen & Resume Assessment"
                    : "Enter Fullscreen & Begin Assessment"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // PHASE: ACTIVE TEST ATTEMPT
  // ==========================================
  if (!test || !question) {
    return (
      <main className="app-page flex min-h-screen items-center justify-center text-sm text-black/50">
        Preparing your assessment workspace...
      </main>
    );
  }

  const isCurrentQuestionSubmitted = Boolean(
    attempt?.answers?.find((a) => String(a.question) === String(question._id))?.submission
  );

  return (
    <main className="solve-page min-h-screen flex flex-col relative">
      {/* Fullscreen Required Modal - Blocks view & prevents giving test until in fullscreen */}
      {!isFullscreen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-xl p-4 animate-fade-in select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-rose-500/40 bg-[#161a16]/95 backdrop-blur-2xl p-8 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] space-y-6">
            {/* Police Siren Emergency Beacon */}
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              {/* Fast flickering ambient glow */}
              <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-xl animate-siren-flicker-fast" />

              {/* Rotating outer beacon ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-rose-500/80 animate-siren-rotate" />

              {/* Rotating light beam highlight ring */}
              <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-white border-r-rose-400 animate-siren-rotate-fast" />

              {/* Siren Housing Circle */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/35 via-rose-500/15 to-black/60 border border-rose-500/50 shadow-[0_0_35px_rgba(244,63,94,0.5)]">
                {/* Fast flickering police siren light */}
                <Siren className="h-10 w-10 text-rose-400 animate-siren-flicker-fast" />
              </div>
            </div>

            {/* Warning Text */}
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-rose-300 border border-rose-500/30">
                <AlertTriangle className="h-3.5 w-3.5" />
                Assessment Locked
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Fullscreen Mode Required
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-md mx-auto">
                To maintain assessment integrity, this examination must be taken strictly in full-screen mode. Questions and coding submission are disabled until full-screen is restored.
              </p>
            </div>

            {/* Violation Alert pill if violations recorded */}
            {violations > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200 font-mono">
                ⚠️ {violations} incident{violations > 1 ? "s" : ""} logged with your instructor. Continued exits may lead to disqualification.
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={enterFullscreen}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#bd5b3d] hover:bg-[#a94e34] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Maximize2 className="h-5 w-5" />
                <span>Return to Fullscreen & Resume</span>
              </button>
            </div>

            <p className="text-[11px] font-mono text-white/40">
              Assessment countdown continues while fullscreen is inactive.
            </p>
          </div>
        </div>
      )}

      {/* Real-time Anti-Cheat Violation Banner */}
      {violationBanner && (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-rose-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 animate-bounce" />
            <span>{violationBanner}</span>
          </div>
          <button
            onClick={() => setViolationBanner("")}
            className="text-white/80 hover:text-white text-xs underline ml-4"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Test Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:px-8 bg-[#131713]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#bd5b3d]/20 text-[#bd5b3d] font-bold text-xs">
            &lt;/&gt;
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="mono text-[10px] uppercase tracking-[.18em] text-[#b9c5ad]">Timed Assessment</p>
              {/* Integrity status pill */}
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                violations > 2
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : violations > 0
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}>
                <ShieldCheck className="h-3 w-3" />
                {violations === 0 ? "Integrity: Clean" : `${violations} violation${violations > 1 ? "s" : ""} logged`}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-white">{test.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Fullscreen restore button if exited */}
          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition animate-pulse"
              title="Return to fullscreen mode"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Return to Fullscreen</span>
            </button>
          )}

          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-sm ${
              secondsLeft < 300
                ? "border-[#bd5b3d] bg-[#bd5b3d]/15 text-[#f1ad91] animate-pulse"
                : "border-white/15 bg-white/5 text-[#b9c5ad]"
            }`}
          >
            <Clock3 className="h-4 w-4" />
            <span>{timeLabel} remaining</span>
          </div>

          <button
            onClick={() => setShowConfirmFinish(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#bd5b3d] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a94e34] transition shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Finish Test</span>
          </button>
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <div className="grid flex-1 lg:grid-cols-[.9fr_1.1fr] min-h-[calc(100vh-76px)]">
        {/* Left: Question Navigation & Details */}
        <section 
          className="flex flex-col border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r overflow-y-auto max-h-[calc(100vh-76px)] select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Question Tabs */}
          <div className="mb-5 flex flex-wrap gap-2 border-b border-white/10 pb-4">
            {test.questions.map((item, index) => {
              const isSubmitted = Boolean(
                attempt?.answers?.find((a) => String(a.question) === String(item._id))?.submission
              );
              const isActive = index === activeQuestion;
              const qMarks = test.questionMarks?.find((qm) => String(qm.question) === String(item._id))?.marks || 10;
              return (
                <button
                  key={item._id}
                  onClick={() => {
                    setActiveQuestion(index);
                    setRunResult(null);
                    setSubmissionResult(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-[#bd5b3d] text-white shadow-sm font-semibold"
                      : isSubmitted
                      ? "bg-[#68765d]/30 text-[#b9c5ad] border border-[#68765d]/40"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <span>Q{index + 1}</span>
                  {isStaff && (
                    <span className="text-[10px] opacity-75 font-mono">({qMarks}pts)</span>
                  )}
                  {isSubmitted && <CheckCircle2 className="h-3 w-3 text-[#9cad91]" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#b9c5ad] mb-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#9cad91]" />
              <span>
                {isCurrentQuestionSubmitted ? "Submission recorded" : "Unsubmitted draft"}
              </span>
            </span>
            <div className="flex items-center gap-2">
              {isStaff && (
                <span className="rounded-full bg-[#bd5b3d]/20 border border-[#bd5b3d]/30 px-2.5 py-0.5 text-[11px] font-mono text-[#f1ad91] font-semibold">
                  {test.questionMarks?.find((qm) => String(qm.question) === String(question._id))?.marks || 10} Marks
                </span>
              )}
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono capitalize text-white/75">
                {question.difficultyLevel}
              </span>
            </div>
          </div>

          <h2 className="serif text-3xl font-semibold text-white tracking-tight">{question.title}</h2>

          {question.tags && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(Array.isArray(question.tags) ? question.tags : [question.tags]).map((tag, idx) => (
                <span key={idx} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-mono text-white/50">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2">Problem Description</h4>
            <div className="whitespace-pre-wrap text-sm leading-7 text-white/80 font-normal select-text">
              {question.description}
            </div>
          </div>

          {/* AI-Powered Hints (if enabled for this assessment) */}
          {test?.enableAiHints && (
            <div className="mt-6 rounded-xl border border-[#bd5b3d]/30 bg-[#bd5b3d]/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#f1ad91]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Copilot Hints ({hintCount[String(question._id)] || 0}/3)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGetAiHint(question, answers[question._id] || DEFAULT_STARTER[language] || "")}
                  disabled={loadingHint || (hintCount[String(question._id)] || 0) >= 3}
                  className="flex items-center gap-1.5 rounded-lg border border-[#bd5b3d]/40 bg-[#bd5b3d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#a94e34] disabled:opacity-50 transition cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {loadingHint
                      ? "Generating Hint..."
                      : (hintCount[String(question._id)] || 0) >= 3
                      ? "Max Hints Reached"
                      : `Request Hint #${(hintCount[String(question._id)] || 0) + 1}`}
                  </span>
                </button>
              </div>

              {(hintsList[String(question._id)] || []).length > 0 ? (
                <div className="space-y-2 pt-2">
                  {(hintsList[String(question._id)] || []).map((h) => (
                    <div key={h.number} className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-white/85 font-mono">
                      <span className="font-bold text-[#f1ad91]">Hint #{h.number}:</span> {h.text}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-white/50">
                  AI hints are enabled for this assessment. If you are stuck on algorithmic intuition, request a hint above.
                </p>
              )}
            </div>
          )}

          {/* Visible Sample Test Cases */}
          {question.visibleTestCases && question.visibleTestCases.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-5 space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#b9c5ad]">Sample Test Cases</h4>
              {question.visibleTestCases.map((tc, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[.02] p-4 text-xs font-mono space-y-2">
                  <div className="font-semibold text-white/50">Example {idx + 1}</div>
                  <div>
                    <span className="text-white/40 text-[11px] block">Input:</span>
                    <pre className="rounded bg-black/40 p-2 text-white/90 overflow-x-auto whitespace-pre-wrap mt-0.5">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-white/40 text-[11px] block">Expected Output:</span>
                    <pre className="rounded bg-black/40 p-2 text-emerald-400 overflow-x-auto whitespace-pre-wrap mt-0.5">
                      {tc.output}
                    </pre>
                  </div>
                  {tc.explanation && (
                    <div className="text-white/50 text-[11px] pt-1">
                      <strong className="text-white/60">Explanation:</strong> {tc.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Code Editor & Execution Panel */}
        <section className="flex flex-col bg-[#161a16] overflow-y-auto max-h-[calc(100vh-76px)]">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 bg-[#111411]">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#9cad91]" />
              <span className="mono text-[11px] text-white/50">
                solution_{activeQuestion + 1}.{language === "javascript" ? "js" : language === "java" ? "java" : "cpp"}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                <Lock className="h-2.5 w-2.5" />
                Paste Locked
              </span>
            </div>

            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className="text-xs font-mono text-[#9cad91] animate-fade-in">{saveStatus}</span>
              )}
              <select
                value={language}
                onChange={(event) => handleLanguageChange(event.target.value)}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="c++" className="bg-[#1c1b19]">C++</option>
                <option value="java" className="bg-[#1c1b19]">Java</option>
                <option value="javascript" className="bg-[#1c1b19]">JavaScript</option>
              </select>
            </div>
          </div>

          {/* Textarea Code Editor with onPaste lock */}
          <textarea
            value={answers[question._id] || ""}
            onChange={(event) => setAnswers({ ...answers, [question._id]: event.target.value })}
            onPaste={(e) => {
              e.preventDefault();
              setViolationBanner("📋 Clipboard paste is disabled during timed assessments. Please write your code directly.");
              setTimeout(() => setViolationBanner(""), 5000);
            }}
            placeholder="// Write your solution directly. Clipboard paste is locked for assessment integrity."
            className="min-h-[360px] flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-6 text-white/90 outline-none selection:bg-[#bd5b3d]/40"
            spellCheck="false"
          />

          {/* Execution Output Panel (Run or Submit) */}
          {(runResult || submissionResult) && (
            <div className="border-t border-white/10 bg-[#0e110e] p-5 text-xs font-mono">
              {/* Run Code Results */}
              {runResult && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white/60 uppercase tracking-wider text-[11px]">Run Evaluation</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      runResult.status === "accepted" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {runResult.status === "accepted" ? "All Sample Tests Passed" : runResult.errorMessage || "Tests Failed"}
                    </span>
                  </div>

                  {runResult.testCaseDetails && (
                    <div className="space-y-2 mt-2">
                      {runResult.testCaseDetails.map((tc, i) => (
                        <div key={i} className={`p-2.5 rounded border text-[11px] ${
                          tc.passed ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300" : "border-rose-500/30 bg-rose-950/20 text-rose-300"
                        }`}>
                          <div className="flex justify-between font-bold mb-1">
                            <span>Case {tc.index}: {tc.status}</span>
                            <span>{tc.time}s</span>
                          </div>
                          {!tc.passed && (
                            <div className="mt-1 space-y-1 text-white/70">
                              <div>Expected: <code className="text-emerald-300">{tc.expectedOutput}</code></div>
                              <div>Actual: <code className="text-rose-300">{tc.actualOutput || "(No output)"}</code></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Code Results */}
              {submissionResult && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white/60 uppercase tracking-wider text-[11px]">Submission Result</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      submissionResult.status === "accepted" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {submissionResult.status === "accepted" ? "Accepted" : submissionResult.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-white/10 bg-black/40 space-y-2">
                    <div className="flex justify-between text-white/70">
                      <span>Test cases passed:</span>
                      <strong className="text-white">
                        {submissionResult.testCasesPassed ?? 0} / {submissionResult.testCasesTotal ?? 0}
                      </strong>
                    </div>
                    {isStaff && submissionResult.earnedMarks !== undefined && (
                      <div className="flex justify-between text-[#b9c5ad] border-t border-white/10 pt-1.5">
                        <span>Marks awarded (Partial Credit):</span>
                        <strong className="text-emerald-400 font-mono text-sm">
                          {submissionResult.earnedMarks} / {submissionResult.maxMarks} marks
                        </strong>
                      </div>
                    )}
                    {submissionResult.runtime !== undefined && (
                      <div className="flex justify-between text-white/70">
                        <span>Runtime:</span>
                        <span>{submissionResult.runtime}s</span>
                      </div>
                    )}
                    {submissionResult.errorMessage && (
                      <p className="text-rose-400 text-xs mt-2 pt-2 border-t border-white/10">
                        {submissionResult.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#111411] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-mono text-white/50">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {saveStatus || "Auto-save active"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{isRunning ? "Running..." : "Run sample tests"}</span>
              </button>

              <button
                onClick={handleSubmitQuestion}
                disabled={isSubmitting || isRunning}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#bd5b3d] px-5 py-2 text-xs font-semibold text-white hover:bg-[#a94e34] transition shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Grading..." : "Submit answer"}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal: Finish Test */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e231e] p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Finish Timed Assessment?</h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Are you sure you want to finalize your submission? Once finished, your answers and integrity logs will be submitted to your educator.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmFinish(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white/60 hover:text-white"
              >
                Keep working
              </button>
              <button
                onClick={() => finishTest(false)}
                disabled={isFinishing}
                className="flex items-center gap-2 rounded-lg bg-[#bd5b3d] px-5 py-2 text-xs font-semibold text-white hover:bg-[#a94e34] transition"
              >
                <span>{isFinishing ? "Submitting..." : "Yes, finish assessment"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
