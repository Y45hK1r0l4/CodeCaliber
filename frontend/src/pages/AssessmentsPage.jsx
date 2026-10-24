import React, { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  Plus, 
  Copy, 
  Clock3, 
  X,
  ShieldCheck,
  Key,
  Sparkles,
  ArrowRight,
  ClipboardList,
  History,
  BarChart3,
  StopCircle,
  AlertCircle
} from "lucide-react";
import { axiosClient } from "../utils/axiosClient";
import { useSelector } from "react-redux";
import { NavLink, useNavigate, useLocation, useSearchParams } from "react-router";

export default function AssessmentsPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testCodeInput, setTestCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [createdBanner, setCreatedBanner] = useState(null);
  const [closingId, setClosingId] = useState(null);

  const initialTab = searchParams.get("tab") === "history" ? "history" : "active";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "history" || tabParam === "active") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", newTab);
    setSearchParams(newParams);
  };

  const isStaff = ["admin", "evaluator"].includes(user?.role);

  // Auto-fill or auto-join from URL parameter after login
  useEffect(() => {
    const rawCode = searchParams.get("code") || location.state?.testCode;
    if (rawCode) {
      const formatted = rawCode.trim().toUpperCase();
      setTestCodeInput(formatted);
      if (user) {
        setIsJoining(true);
        setMessage("");
        axiosClient.post("/tests/join", { testCode: formatted })
          .then(({ data }) => {
            setTestCodeInput("");
            setMessage(data.message || "Assessment added to your list successfully!");
            loadTests();
          })
          .catch((err) => {
            setMessage(err.response?.data?.message || "No assessment found with that Test Code.");
          })
          .finally(() => setIsJoining(false));
      }
    }
  }, [user, searchParams, location.state]);

  // Check if redirected from creating a test
  useEffect(() => {
    if (location.state?.createdTestCode) {
      setCreatedBanner({
        code: location.state.createdTestCode,
        title: location.state.createdTestTitle || "Assessment"
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadTests = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await axiosClient.get("/tests");
      setTests(data.tests || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [user]);

  // Direct Test Code Join (Option B)
  const handleJoinByCode = async (e) => {
    if (e) e.preventDefault();
    const raw = testCodeInput.trim().toUpperCase();
    if (!raw) return;

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/assessments?code=${raw}`)}`, {
        state: { from: `/assessments?code=${raw}`, testCode: raw }
      });
      return;
    }

    try {
      setIsJoining(true);
      setMessage("");
      const { data } = await axiosClient.post("/tests/join", { testCode: raw });
      setTestCodeInput("");
      setMessage(data.message || "Assessment added to your list successfully!");
      // Reload tests so the card appears right below with "Start Test"
      await loadTests();
    } catch (error) {
      setMessage(error.response?.data?.message || "No assessment found with that Test Code. Please verify with your educator.");
    } finally {
      setIsJoining(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleCloseTest = async (testId, title) => {
    if (
      !window.confirm(
        `Are you sure you want to conclude assessment "${title}"?\n\nIt will be closed immediately and moved to "Assessment History & Results".`
      )
    ) {
      return;
    }
    try {
      setClosingId(testId);
      await axiosClient.patch(`/tests/${testId}/close`);
      setMessage(`Assessment "${title}" has ended and moved to Assessment History.`);
      await loadTests();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to conclude assessment.");
    } finally {
      setClosingId(null);
    }
  };

  // Separation into Active vs History
  const now = Date.now();
  const isTestClosed = (test) => Boolean(test.endsAt && new Date(test.endsAt).getTime() <= now);
  const isStudentAttemptDone = (test) =>
    Boolean(test.attempt && (test.attempt.status === "submitted" || test.attempt.status === "expired"));

  const activeTests = tests.filter((test) => {
    if (isTestClosed(test)) return false;
    if (!isStaff && isStudentAttemptDone(test)) return false;
    return true;
  });

  const historyTests = tests.filter((test) => {
    if (isTestClosed(test)) return true;
    if (!isStaff && isStudentAttemptDone(test)) return true;
    return false;
  });

  const currentDisplayTests = activeTab === "history" ? historyTests : activeTests;

  return (
    <main className="app-page px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-black/10 pb-8 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[.2em] text-[#68765d]">
              <ClipboardList className="h-4 w-4" /> Assessment Center
            </div>
            <h1 className="serif text-4xl sm:text-5xl tracking-tight text-black/90">
              {activeTab === "history" ? "Assessment History" : "Your Assessments"}
            </h1>
            <p className="mt-2 text-sm text-black/55 max-w-xl">
              {activeTab === "history"
                ? "Review concluded assessments, candidate scorecards, answer breakdowns, and proctoring audit trails."
                : "Enter a direct Test Code to begin an exam, or build tests and monitor live anti-cheat integrity."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Test Code Input Form */}
            <form onSubmit={handleJoinByCode} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Test Code (e.g. TEST-A89F)"
                value={testCodeInput}
                onChange={(e) => setTestCodeInput(e.target.value)}
                className="rounded-full border border-black/20 bg-[#faf7f1] px-4 py-2.5 text-xs font-mono font-medium outline-none focus:border-[#bd5b3d] shadow-inner w-56 sm:w-64 uppercase"
              />
              <button
                type="submit"
                disabled={isJoining}
                className="rounded-full bg-[#bd5b3d] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#a94e34] transition shadow-sm disabled:opacity-50"
              >
                {isJoining ? "Checking..." : "Take Test"}
              </button>
            </form>

            {isStaff && (
              <button
                onClick={() => navigate("/admin/createTest")}
                className="terracotta-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create Test</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlighted Banner for newly created test with direct code */}
        {createdBanner && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-950 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Test Created Successfully</span>
                <div className="font-semibold text-sm">{createdBanner.title}</div>
                <div className="text-xs text-emerald-800/80 mt-0.5">
                  Write this code on the whiteboard or share with students to start:
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-emerald-500/40 bg-white px-4 py-2 font-mono text-lg font-black text-emerald-900 tracking-wider shadow-sm">
                {createdBanner.code}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdBanner.code);
                  setMessage(`Test code ${createdBanner.code} copied!`);
                }}
                className="rounded-xl bg-emerald-700 p-2.5 text-white hover:bg-emerald-800 transition"
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCreatedBanner(null)}
                className="text-xs text-emerald-800 underline ml-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Global Feedback Banner */}
        {message && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#bd5b3d]/20 bg-[#f0d9d0] px-4 py-3 text-xs text-[#8e402c]">
            <span>{message}</span>
            <button onClick={() => setMessage("")} className="hover:opacity-70">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-black/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTabChange("active")}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === "active"
                  ? "border-[#bd5b3d] text-[#1c1b19]"
                  : "border-transparent text-black/45 hover:text-black/80"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Active Assessments</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-bold ${
                  activeTab === "active"
                    ? "bg-[#bd5b3d]/15 text-[#bd5b3d]"
                    : "bg-black/5 text-black/50"
                }`}
              >
                {activeTests.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("history")}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === "history"
                  ? "border-[#bd5b3d] text-[#1c1b19]"
                  : "border-transparent text-black/45 hover:text-black/80"
              }`}
            >
              <History className="h-4 w-4" />
              <span>{isStaff ? "Concluded Tests" : "Past Submissions"}</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-bold ${
                  activeTab === "history"
                    ? "bg-[#bd5b3d]/15 text-[#bd5b3d]"
                    : "bg-black/5 text-black/50"
                }`}
              >
                {historyTests.length}
              </span>
            </button>
          </div>

          {isStaff && (
            <button
              onClick={() => navigate("/admin/history")}
              className="inline-flex items-center gap-1.5 pb-2 text-xs font-semibold text-[#bd5b3d] hover:text-[#a94e34] transition cursor-pointer"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Full Analytics & Reports Console</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Tests Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="p-12 text-center text-xs text-black/40">Loading assessments...</div>
          ) : currentDisplayTests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/15 p-12 text-center bg-black/[0.01]">
              {activeTab === "history" ? (
                <>
                  <History className="h-10 w-10 text-black/25 mx-auto" />
                  <h3 className="mt-4 text-lg font-semibold text-black/80">No completed assessments in history</h3>
                  <p className="mt-2 text-xs text-black/50 max-w-sm mx-auto">
                    {isStaff
                      ? "Assessments move here automatically once they conclude or when you manually end them. You can view scorecards and audit trails from here."
                      : "Assessments you complete and submit will move here so your active list stays clean. You'll be able to review your results anytime."}
                  </p>
                  <button
                    onClick={() => handleTabChange("active")}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/20 bg-white px-5 py-2.5 text-xs font-semibold text-black/80 hover:bg-black/5 transition shadow-sm cursor-pointer"
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>View Active Assessments</span>
                  </button>
                </>
              ) : (
                <>
                  <ClipboardList className="h-10 w-10 text-black/25 mx-auto" />
                  <h3 className="mt-4 text-lg font-semibold text-black/80">No active assessments</h3>
                  <p className="mt-2 text-xs text-black/50 max-w-sm mx-auto">
                    {isStaff
                      ? "You have no active or scheduled assessments right now. Create a new test or check History for completed tests."
                      : "No active assessments scheduled right now. Enter a direct Test Code from your educator at the top to take an exam."}
                  </p>
                  {isStaff ? (
                    <button
                      onClick={() => navigate("/admin/createTest")}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#bd5b3d] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#a94e34] transition shadow-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Build First Test</span>
                    </button>
                  ) : historyTests.length > 0 ? (
                    <button
                      onClick={() => handleTabChange("history")}
                      className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/20 bg-white px-5 py-2.5 text-xs font-semibold text-black/80 hover:bg-black/5 transition shadow-sm cursor-pointer"
                    >
                      <History className="h-4 w-4" />
                      <span>View Past Submissions ({historyTests.length})</span>
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentDisplayTests.map((test) => {
                const isUpcoming = test.startsAt && new Date(test.startsAt).getTime() > now;
                const isClosed = test.endsAt && new Date(test.endsAt).getTime() <= now;
                const isActive = !isUpcoming && !isClosed;
                const hasAttempt = Boolean(test.attempt);
                const attemptSubmitted = hasAttempt && (test.attempt.status === "submitted" || test.attempt.status === "expired");

                return (
                  <div
                    key={test._id}
                    className="flex flex-col justify-between rounded-2xl border border-black/10 bg-[#faf7f1] p-5 shadow-sm hover:border-black/20 transition"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        {test.testCode && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-900">
                            <Key className="h-3 w-3 text-amber-700" />
                            <span>{test.testCode}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(test.testCode);
                                setMessage(`Copied Test Code "${test.testCode}"!`);
                                setTimeout(() => setMessage(""), 2500);
                              }}
                              className="ml-1 text-black/40 hover:text-black cursor-pointer"
                              title="Copy code"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </span>
                        )}

                        <div>
                          {isClosed ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-500/20 bg-neutral-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                              Closed
                            </span>
                          ) : isUpcoming ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Upcoming
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-[#1c1b19] line-clamp-1">{test.title}</h3>

                      {/* Creator */}
                      {test.createdBy && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-black/60">
                          <span className="text-black/40">Created by:</span>
                          <NavLink
                            to={`/profile/${test.createdBy._id || test.createdBy}`}
                            className="font-semibold text-black/80 hover:text-[#bd5b3d] hover:underline"
                            title="View evaluator profile"
                          >
                            {test.createdBy.firstName} {test.createdBy.lastName}
                            {test.createdBy.role ? ` (${test.createdBy.role === "admin" ? "Admin" : "Evaluator"})` : ""}
                          </NavLink>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="mt-2 text-xs text-black/55 space-y-1">
                        <div>
                          {isStaff && (
                            <>
                              <strong>{test.totalMarks || (test.questions?.length || 1) * 10}</strong> Marks ·{" "}
                            </>
                          )}
                          <strong>{test.questions?.length || 0}</strong> questions · <strong>{test.durationMinutes}</strong> mins
                        </div>
                        {test.startsAt && (
                          <div className="text-[11px] text-black/50">
                            Opens: <strong>{formatDateTime(test.startsAt)}</strong>
                          </div>
                        )}
                        {test.endsAt && (
                          <div className="text-[11px] text-black/50">
                            {isClosed ? "Ended: " : "Closes: "}
                            <strong>{formatDateTime(test.endsAt)}</strong>
                          </div>
                        )}
                      </div>

                      {/* Participant submission state */}
                      {hasAttempt && test.attempt.status !== "unlocked" && (
                        <div
                          className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold flex items-center justify-between ${
                            attemptSubmitted
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-900"
                              : "border-amber-500/25 bg-amber-500/10 text-amber-900"
                          }`}
                        >
                          <span className="capitalize">
                            {test.attempt.status === "in_progress" ? "In Progress" : `Result: ${test.attempt.status}`}
                          </span>
                          <span className="font-mono text-sm">
                            {isStaff ? (
                              <>
                                {test.attempt.score} / {test.attempt.total} marks (
                                {Math.round(((test.attempt.score || 0) / (test.attempt.total || 1)) * 100)}%)
                              </>
                            ) : (
                              <>
                                {test.attempt.questionsSolved ?? 0} / {test.attempt.totalQuestions ?? (test.questions?.length || 0)} solved
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] text-sky-800 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                        Anti-Cheat
                      </span>

                      {isStaff ? (
                        <div className="flex items-center gap-2">
                          {activeTab === "active" && !isClosed && (
                            <button
                              onClick={() => handleCloseTest(test._id, test.title)}
                              disabled={closingId === test._id}
                              className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer disabled:opacity-50"
                              title="End assessment early and move to History"
                            >
                              <StopCircle className="h-3 w-3 text-red-500" />
                              <span>{closingId === test._id ? "Ending..." : "End Test"}</span>
                            </button>
                          )}
                          <NavLink
                            to={`/admin/test/${test._id}/performance`}
                            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                              activeTab === "history"
                                ? "bg-[#1c1b19] text-white hover:bg-black shadow-sm"
                                : "border border-[#bd5b3d] text-[#a94e34] hover:bg-[#bd5b3d]/10"
                            }`}
                          >
                            <BarChart3 className="h-3 w-3" />
                            <span>{activeTab === "history" ? "Results & Audit" : "Live Audit"}</span>
                            <ArrowRight className="h-3 w-3" />
                          </NavLink>
                        </div>
                      ) : (
                        <NavLink
                          to={`/test/${test._id}`}
                          className={`inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition shadow-sm ${
                            attemptSubmitted || isClosed
                              ? "bg-neutral-800 hover:bg-black"
                              : isUpcoming
                              ? "bg-[#53634a] hover:bg-[#43513b]"
                              : "bg-[#bd5b3d] hover:bg-[#a94e34]"
                          }`}
                        >
                          {attemptSubmitted ? (
                            <span>Review Submission</span>
                          ) : isUpcoming ? (
                            <>
                              <Clock3 className="h-3 w-3" />
                              <span>Countdown</span>
                            </>
                          ) : isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{hasAttempt && test.attempt.status === "in_progress" ? "Resume Test" : "Start Test"}</span>
                            </>
                          ) : (
                            <span>View Details</span>
                          )}
                        </NavLink>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
