import React, { useEffect, useState } from "react";
import { useParams, NavLink } from "react-router";
import { axiosClient } from "../utils/axiosClient";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock3, 
  ArrowLeft, 
  Users, 
  Award, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert,
  AlertTriangle,
  Key,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";

export default function TestPerformancePage() {
  const { testId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    axiosClient
      .get(`/tests/${testId}/performance`)
      .then(({ data: result }) => setData(result))
      .catch((requestError) =>
        setError(requestError.response?.data?.message || "Unable to load assessment performance.")
      );
  }, [testId]);

  if (error) {
    return (
      <main className="app-page flex min-h-[calc(100vh-60px)] items-center justify-center p-5">
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center max-w-md">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <NavLink
            to="/assessments"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to assessments</span>
          </NavLink>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-page flex min-h-[calc(100vh-60px)] items-center justify-center text-sm text-black/50">
        Loading assessment performance...
      </main>
    );
  }

  const performance = data.performance || [];
  const submittedCount = performance.filter((p) => p.status === "submitted").length;
  const inProgressCount = performance.filter((p) => p.status === "in_progress").length;
  const notStartedCount = performance.filter((p) => p.status === "not_started").length;
  const totalStudents = performance.length;
  const totalScoreEarned = performance.reduce((sum, p) => sum + (p.score || 0), 0);
  const maxPossible = totalStudents * (data.test.totalMarks || (data.test.questions?.length || 1) * 10);
  const avgPercent = maxPossible > 0 ? Math.round((totalScoreEarned / maxPossible) * 100) : 0;

  const attemptedCount = performance.filter((p) => p.attempt).length;
  const flaggedCount = performance.filter((p) => p.integrityStatus === "flagged").length;
  const suspiciousCount = performance.filter((p) => p.integrityStatus === "suspicious").length;
  const cleanCount = performance.filter((p) => p.attempt && p.integrityStatus === "clean").length;

  return (
    <main className="app-page px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        {/* Top navigation */}
        <div className="mb-6">
          <NavLink
            to="/assessments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/55 hover:text-black transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to assessments</span>
          </NavLink>
        </div>

        {/* Title Header */}
        <div className="mb-8 border-b border-black/10 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#68765d]">
              <BarChart3 className="h-4 w-4" /> Educator Analytics & Integrity Audit
            </div>
            <h1 className="serif text-4xl sm:text-5xl tracking-tight">{data.test.title}</h1>
            <p className="mt-2 text-sm text-black/55">
              {data.test.durationMinutes} minute test · {data.test.questions?.length || 0} questions · {data.test.totalMarks || (data.test.questions?.length || 1) * 10} Total Marks
              {data.test.startsAt && ` · Starts: ${new Date(data.test.startsAt).toLocaleString()}`}
              {data.test.endsAt && ` · Ends: ${new Date(data.test.endsAt).toLocaleString()}`}
            </p>
            {data.test?.createdBy?.firstName && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-black/70 bg-black/5 px-3 py-1 rounded-full">
                <span className="text-black/45">Assessment created by:</span>
                <NavLink
                  to={`/profile/${data.test.createdBy._id || data.test.createdBy}`}
                  className="font-semibold text-black/90 hover:text-[#bd5b3d] hover:underline"
                >
                  {data.test.createdBy.firstName} {data.test.createdBy.lastName || ""}
                  {data.test.createdBy.role ? ` (${data.test.createdBy.role === "admin" ? "Admin" : "Evaluator"})` : ""}
                </NavLink>
              </div>
            )}
          </div>

          {data.test.testCode && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-600/30 bg-amber-500/10 p-3 shadow-sm">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-900/60 flex items-center gap-1">
                  <Key className="h-3 w-3 text-amber-700" />
                  <span>Direct Test Code</span>
                </div>
                <div className="font-mono text-lg font-black text-amber-950 tracking-wider">
                  {data.test.testCode}
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(data.test.testCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="ml-2 rounded-xl bg-amber-700 p-2 text-white hover:bg-amber-800 transition shadow-sm"
                title="Copy Test Code"
              >
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="rounded-xl border border-black/10 bg-[#f7f3ec] p-4">
            <div className="flex items-center gap-2 text-black/45 text-xs mb-1">
              <Users className="h-3.5 w-3.5" />
              <span>Candidates</span>
            </div>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <div className="text-[10px] text-black/40 mt-0.5">Attempted test</div>
          </div>

          <div className="rounded-xl border border-black/10 bg-[#f7f3ec] p-4">
            <div className="flex items-center gap-2 text-[#53634a] text-xs mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Submitted</span>
            </div>
            <div className="text-2xl font-bold text-[#53634a]">{submittedCount}</div>
            <div className="text-[10px] text-black/40 mt-0.5">
              {totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0}% completion
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-[#f7f3ec] p-4">
            <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
              <Clock3 className="h-3.5 w-3.5" />
              <span>In progress</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">{inProgressCount}</div>
            <div className="text-[10px] text-black/40 mt-0.5">{notStartedCount} unstarted</div>
          </div>

          <div className="rounded-xl border border-black/10 bg-[#f7f3ec] p-4">
            <div className="flex items-center gap-2 text-[#bd5b3d] text-xs mb-1">
              <Award className="h-3.5 w-3.5" />
              <span>Class Average</span>
            </div>
            <div className="text-2xl font-bold text-[#bd5b3d]">{avgPercent}%</div>
            <div className="text-[10px] text-black/40 mt-0.5">
              {totalStudents > 0 ? (totalScoreEarned / totalStudents).toFixed(1) : 0} avg marks
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-[#f7f3ec] p-4">
            <div className="flex items-center gap-2 text-sky-700 text-xs mb-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Integrity Flags</span>
            </div>
            <div className="text-2xl font-bold flex items-center gap-1.5">
              <span className={flaggedCount > 0 ? "text-rose-600" : suspiciousCount > 0 ? "text-amber-600" : "text-emerald-700"}>
                {flaggedCount + suspiciousCount}
              </span>
              <span className="text-xs font-normal text-black/40">/ {attemptedCount} attempts</span>
            </div>
            <div className="text-[10px] text-black/40 mt-0.5">
              {cleanCount} clean · {suspiciousCount} susp. · {flaggedCount} flag
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#f7f3ec] shadow-sm">
          {performance.length === 0 ? (
            <div className="p-8 text-center text-xs text-black/45">
              No students have started this assessment yet. Share the Test Code <strong>{data.test.testCode}</strong> with students.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/10 text-xs uppercase tracking-[.12em] text-black/45 bg-[#faf7f1]">
                  <tr>
                    <th className="px-5 py-4">Participant</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Problem Breakdown (Partial Credit)</th>
                    <th className="px-5 py-4">Anti-Cheat Audit</th>
                    <th className="px-5 py-4">Submission Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {performance.map((row) => {
                    const participant = row.participant || row.student;
                    return (
                      <tr key={participant?._id || Math.random()} className="hover:bg-white/40 transition">
                        <td className="px-5 py-4">
                          {participant?._id ? (
                            <NavLink
                              to={`/profile/${participant._id}`}
                              className="font-semibold text-black/90 hover:text-[#bd5b3d] hover:underline inline-flex items-center gap-1.5 group cursor-pointer"
                              title="View participant profile"
                            >
                              <span>{participant?.firstName || "Participant"} {participant?.lastName || ""}</span>
                              <ExternalLink className="h-3 w-3 text-black/35 group-hover:text-[#bd5b3d] transition" />
                            </NavLink>
                          ) : (
                            <div className="font-semibold text-black/85">
                              {participant?.firstName || "Participant"} {participant?.lastName || ""}
                            </div>
                          )}
                          <div className="text-xs text-black/45 font-mono">{participant?.emailId || "—"}</div>
                        </td>

                      <td className="px-5 py-4">
                        {row.status === "submitted" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Submitted</span>
                          </span>
                        ) : row.status === "in_progress" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>In progress</span>
                          </span>
                        ) : row.status === "expired" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Expired</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-black/40">
                            <span>Not started</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-sm text-black/85">
                          {row.score} / {row.total} marks
                        </span>
                        <span className="block text-[11px] text-black/45">
                          {row.total > 0 ? Math.round((row.score / row.total) * 100) : 0}%
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {row.questionBreakdown && row.questionBreakdown.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {row.questionBreakdown.map((q, idx) => {
                              const isFull = q.earnedMarks >= q.maxMarks && q.maxMarks > 0;
                              const isPartial = q.earnedMarks > 0 && q.earnedMarks < q.maxMarks;
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold ${
                                    isFull
                                      ? "bg-emerald-500/15 text-emerald-800 border border-emerald-500/25"
                                      : isPartial
                                      ? "bg-amber-500/15 text-amber-800 border border-amber-500/25"
                                      : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                                  }`}
                                  title={`${q.title}: ${q.testCasesPassed}/${q.testCasesTotal} test cases passed`}
                                >
                                  <span>Q{idx + 1}:</span>
                                  <span>{q.earnedMarks}/{q.maxMarks}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-black/40">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {!row.attempt ? (
                          <span className="text-xs text-black/35">—</span>
                        ) : row.integrityStatus === "flagged" ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>Flagged</span>
                            </span>
                            <span className="text-[10px] text-rose-800/70 mt-0.5 font-mono">
                              {row.tabSwitches || 0} tab switches · {row.fullscreenExits || 0} fs exits
                            </span>
                          </div>
                        ) : row.integrityStatus === "suspicious" ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Suspicious</span>
                            </span>
                            <span className="text-[10px] text-amber-900/70 mt-0.5 font-mono">
                              {row.tabSwitches || 0} tab switches · {row.fullscreenExits || 0} fs exits
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Clean</span>
                            </span>
                            <span className="text-[10px] text-black/40 mt-0.5 font-mono">
                              0 violations
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs font-mono text-black/50">
                        {row.attempt?.submittedAt
                          ? new Date(row.attempt.submittedAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
