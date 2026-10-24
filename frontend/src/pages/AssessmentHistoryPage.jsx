import React, { useEffect, useState, useMemo } from "react";
import { NavLink, useNavigate } from "react-router";
import { 
  History, 
  ArrowLeft, 
  Search, 
  BarChart3, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Copy, 
  Check, 
  Plus, 
  Users, 
  Clock3, 
  StopCircle,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { axiosClient } from "../utils/axiosClient";

export default function AssessmentHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'closed' | 'active'
  const [copiedCode, setCopiedCode] = useState(null);
  const [closingId, setClosingId] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await axiosClient.get("/tests/history");
      setHistory(data.history || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assessment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCloseEarly = async (testId, title) => {
    if (!window.confirm(`Conclude assessment "${title}" now?\n\nIt will be marked as ended immediately.`)) {
      return;
    }
    try {
      setClosingId(testId);
      await axiosClient.patch(`/tests/${testId}/close`);
      await loadHistory();
    } catch (err) {
      alert(err.response?.data?.message || "Could not conclude assessment.");
    } finally {
      setClosingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // High-level KPI aggregations
  const stats = useMemo(() => {
    const totalAssessments = history.length;
    const totalCandidates = history.reduce((sum, item) => sum + (item.totalCandidates || 0), 0);
    const completedCandidates = history.reduce((sum, item) => sum + (item.completedCandidates || 0), 0);
    const totalFlags = history.reduce((sum, item) => sum + (item.flaggedCandidates || 0), 0);
    
    // Weighted avg score %
    let totalScoreSum = 0;
    let candidatesWithScores = 0;
    history.forEach((h) => {
      if (h.completedCandidates > 0 && h.totalMarks > 0) {
        totalScoreSum += (h.avgScore / h.totalMarks) * h.completedCandidates;
        candidatesWithScores += h.completedCandidates;
      }
    });
    const avgScorePercent = candidatesWithScores > 0 
      ? Math.round((totalScoreSum / candidatesWithScores) * 100) 
      : 0;

    return {
      totalAssessments,
      totalCandidates,
      completedCandidates,
      totalFlags,
      avgScorePercent,
    };
  }, [history]);

  // Filtered assessment list
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.testCode?.toLowerCase().includes(q) ||
        item.createdBy?.firstName?.toLowerCase().includes(q) ||
        item.createdBy?.lastName?.toLowerCase().includes(q)
      );
    });
  }, [history, searchQuery]);

  return (
    <main className="app-page px-4 py-10 sm:px-8 lg:px-12 text-[#1c1b19]">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-black/10 pb-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-[#68765d]">
              <History className="h-4 w-4" /> Assessment Telemetry & Archive
            </div>
            <h1 className="serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-black/90">
              Assessment History & Reports
            </h1>
            <p className="mt-2 text-sm text-black/55 max-w-2xl">
              Audit past coding assessments, candidate scores, question-by-question metrics, and proctoring compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black/80 hover:bg-black/5 transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => navigate("/assessments")}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black/80 hover:bg-black/5 transition shadow-sm cursor-pointer"
            >
              <Clock3 className="h-3.5 w-3.5" />
              <span>Live Assessments</span>
            </button>
            <button
              onClick={() => navigate("/admin/createTest")}
              className="terracotta-button inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Assessment</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-900">
            {error}
          </div>
        )}

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-black/10 bg-[#faf7f1] p-5 shadow-sm">
            <div className="flex items-center justify-between text-black/45">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tests</span>
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-black/90">
              {stats.totalAssessments}
            </div>
            <div className="mt-1 text-[11px] text-black/50">
              Created across organization
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#faf7f1] p-5 shadow-sm">
            <div className="flex items-center justify-between text-black/45">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Candidates Evaluated</span>
              <Users className="h-4 w-4" />
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-black/90">
              {stats.completedCandidates}
            </div>
            <div className="mt-1 text-[11px] text-black/50">
              {stats.totalCandidates} total test sessions
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#faf7f1] p-5 shadow-sm">
            <div className="flex items-center justify-between text-black/45">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Cohort Avg Score</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-black/90">
              {stats.avgScorePercent}%
            </div>
            <div className="mt-1 text-[11px] text-black/50">
              Across submitted attempts
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#faf7f1] p-5 shadow-sm">
            <div className="flex items-center justify-between text-black/45">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Proctoring Flags</span>
              {stats.totalFlags > 0 ? (
                <ShieldAlert className="h-4 w-4 text-amber-600" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-black/90">
              {stats.totalFlags}
            </div>
            <div className="mt-1 text-[11px] text-black/50">
              Tab switch / fullscreen alerts
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
            <input
              type="text"
              placeholder="Search by test name, test code, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-black/15 bg-white pl-10 pr-4 py-2 text-xs outline-none focus:border-[#bd5b3d] shadow-sm"
            />
          </div>

          <div className="text-xs text-black/50 font-medium">
            Showing <strong>{filteredHistory.length}</strong> concluded assessment{filteredHistory.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Assessment Reports Table / List */}
        {loading ? (
          <div className="p-16 text-center text-xs text-black/40 font-mono">
            Loading assessment archive and telemetry...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/15 p-16 text-center bg-black/[0.01]">
            <History className="h-10 w-10 text-black/25 mx-auto" />
            <h3 className="mt-4 text-base font-semibold text-black/80">
              No matching assessments found
            </h3>
            <p className="mt-1.5 text-xs text-black/50 max-w-sm mx-auto">
              {searchQuery
                ? "Try adjusting your search query or clear the filter."
                : "No assessments have been created yet. Launch your first assessment to begin tracking candidate results."}
            </p>
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="mt-5 rounded-full border border-black/20 bg-white px-4 py-2 text-xs font-semibold text-black/75 hover:bg-black/5 transition cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => navigate("/admin/createTest")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#bd5b3d] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#a94e34] transition shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Assessment</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#faf7f1] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black/10 bg-black/[0.02] text-[10px] font-semibold uppercase tracking-wider text-black/50">
                    <th className="py-3.5 px-5">Assessment</th>
                    <th className="py-3.5 px-4">Test Code</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Candidates</th>
                    <th className="py-3.5 px-4">Performance</th>
                    <th className="py-3.5 px-4">Anti-Cheat</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredHistory.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-white/80 transition group"
                    >
                      {/* Title & Metadata */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-black/90 text-sm line-clamp-1">
                          {item.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-black/50">
                          <span>{item.questionsCount} questions</span>
                          <span>·</span>
                          <span>{item.durationMinutes} mins</span>
                          <span>·</span>
                          <span>{item.totalMarks} marks</span>
                          <span>·</span>
                          <span>Concluded: {formatDateTime(item.endsAt || item.createdAt)}</span>
                        </div>
                        {item.createdBy && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-black/60">
                            <span className="text-black/40">Created by:</span>
                            <NavLink
                              to={`/profile/${item.createdBy._id || item.createdBy}`}
                              className="font-semibold text-black/80 hover:text-[#bd5b3d] hover:underline"
                              title="View evaluator profile"
                            >
                              {item.createdBy.firstName} {item.createdBy.lastName}
                              {item.createdBy.role ? ` (${item.createdBy.role === "admin" ? "Admin" : "Evaluator"})` : ""}
                            </NavLink>
                          </div>
                        )}
                      </td>

                      {/* Test Code */}
                      <td className="py-4 px-4 font-mono">
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-600/25 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-900">
                          <Key className="h-3 w-3 text-amber-700" />
                          <span>{item.testCode}</span>
                          <button
                            onClick={() => handleCopyCode(item.testCode)}
                            className="ml-1 text-black/40 hover:text-black cursor-pointer"
                            title="Copy Code"
                          >
                            {copiedCode === item.testCode ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-400/25 bg-neutral-200/50 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                          Concluded
                        </span>
                      </td>

                      {/* Candidates */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-black/85">
                          {item.completedCandidates} submitted
                        </div>
                        <div className="text-[11px] text-black/45">
                          {item.totalCandidates} total attempts
                        </div>
                      </td>

                      {/* Score Metrics */}
                      <td className="py-4 px-4">
                        {item.completedCandidates > 0 ? (
                          <div>
                            <span className="font-semibold text-black/85">
                              Avg: {item.avgScore} / {item.totalMarks}
                            </span>
                            <span className="ml-1 text-[11px] text-black/50">
                              ({Math.round((item.avgScore / (item.totalMarks || 1)) * 100)}%)
                            </span>
                            <div className="text-[11px] text-emerald-800">
                              High: {item.highestScore} marks
                            </div>
                          </div>
                        ) : (
                          <span className="text-black/40 italic text-[11px]">No submissions</span>
                        )}
                      </td>

                      {/* Anti-cheat audit */}
                      <td className="py-4 px-4">
                        {item.flaggedCandidates > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            <ShieldAlert className="h-3 w-3 text-amber-600" />
                            <span>{item.flaggedCandidates} flagged</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span>Clean</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <NavLink
                          to={`/admin/test/${item._id}/performance`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#1c1b19] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition shadow-sm"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>Full Report</span>
                        </NavLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
