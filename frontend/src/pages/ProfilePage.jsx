import React, { useEffect, useState } from "react";
import { axiosClient } from "../utils/axiosClient";
import { useParams, NavLink, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { 
  User as UserIcon, 
  CheckCircle2, 
  Code2, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Award,
  ArrowLeft,
  BarChart3,
  BookOpen
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams(); // For viewing another user's profile
  const { user: currentUser } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const endpoint = id ? `/user/getProfile/${id}` : "/user/getProfile";
        const profileRes = await axiosClient.get(endpoint);
        setProfile(profileRes.data.data);
      } catch (err) {
        console.error("Profile Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="app-page flex min-h-[calc(100vh-60px)] items-center justify-center font-mono text-sm text-black/50">
        Loading user profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-page flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-4 text-sm text-black/60">
        <p>Unable to load profile data.</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/70 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  const isStaffViewer = currentUser && ["admin", "evaluator"].includes(currentUser.role);
  const isTeacherProfile = ["admin", "evaluator"].includes(profile.role);
  const assessments = Array.isArray(profile.assessments) ? profile.assessments : [];
  const testsCreated = Array.isArray(profile.testsCreated) ? profile.testsCreated : [];
  const solvedProblems = Array.isArray(profile.problemsSolved) ? profile.problemsSolved : [];

  const getRoleBadgeClasses = (role) => {
    switch (role?.toLowerCase()) {
      case "participant":
        return "bg-emerald-100/90 text-emerald-900 border-emerald-300";
      case "evaluator":
        return "bg-amber-100/90 text-amber-900 border-amber-300";
      case "admin":
        return "bg-purple-100/90 text-purple-900 border-purple-300";
      default:
        return "bg-stone-200 text-stone-800 border-stone-300";
    }
  };

  const getScoreBadgeClasses = (pct) => {
    if (pct >= 75) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (pct >= 50) return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-rose-50 text-rose-800 border-rose-200";
  };

  const getIntegrityBadge = (status, switches = 0, exits = 0) => {
    if (status === "clean") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Clean
        </span>
      );
    }
    if (status === "suspicious") {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Suspicious
          </span>
          {(switches > 0 || exits > 0) && (
            <span className="text-[10px] text-amber-700/80 font-mono">
              {switches} tabs, {exits} exits
            </span>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-600" /> Flagged
        </span>
        {(switches > 0 || exits > 0) && (
          <span className="text-[10px] text-rose-700/80 font-mono">
            {switches} tabs, {exits} exits
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="app-page py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Back (if visited from admin/audit) */}
        {id && (
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/60 hover:text-black transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to previous view</span>
            </button>
          </div>
        )}

        {/* Profile Identity Card */}
        <div className="rounded-2xl border border-black/10 bg-[#faf7f1] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* High-contrast avatar */}
              <div className="w-16 h-16 rounded-2xl bg-[#68765d] border border-black/10 flex items-center justify-center text-2xl font-bold font-mono text-white shadow-sm">
                {profile.firstName?.[0]?.toUpperCase() || "U"}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="serif text-3xl font-bold text-[#1c1b19] tracking-tight">
                    {profile.firstName} {profile.lastName || ""}
                  </h1>
                  {/* Highly visible, crisp role pill */}
                  <span className={`text-[11px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs ${getRoleBadgeClasses(profile.role)}`}>
                    {profile.role === "participant" ? "Participant" : (profile.role === "evaluator" ? "Evaluator" : "Admin")}
                  </span>
                </div>
                <p className="text-xs text-black/60 font-mono mt-1.5">{profile.emailId}</p>
                {profile.createdAt && (
                  <p className="text-[11px] text-black/40 font-mono mt-0.5">
                    Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-black/10">
              {!isTeacherProfile ? (
                <>
                  <div className="px-4 py-3 rounded-xl bg-white/80 border border-black/10 text-center min-w-[100px] shadow-2xs">
                    <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-black/50">Assessments</div>
                    <div className="text-2xl font-bold font-mono text-[#1c1b19] mt-0.5">{assessments.length}</div>
                  </div>
                  {isStaffViewer && profile.averageScore !== null && profile.averageScore !== undefined && (
                    <div className="px-4 py-3 rounded-xl bg-white/80 border border-black/10 text-center min-w-[100px] shadow-2xs">
                      <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-black/50">Avg Score</div>
                      <div className="text-2xl font-bold font-mono text-[#68765d] mt-0.5">{profile.averageScore}%</div>
                    </div>
                  )}
                  {solvedProblems.length > 0 && (
                    <div className="px-4 py-3 rounded-xl bg-white/80 border border-black/10 text-center min-w-[90px] shadow-2xs">
                      <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-black/50">Problems Solved</div>
                      <div className="text-2xl font-bold font-mono text-black/70 mt-0.5">{solvedProblems.length}</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="px-4 py-3 rounded-xl bg-white/80 border border-black/10 text-center min-w-[110px] shadow-2xs">
                    <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-black/50">Created</div>
                    <div className="text-2xl font-bold font-mono text-[#1c1b19] mt-0.5">{testsCreated.length}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/80 border border-black/10 text-center min-w-[110px] shadow-2xs">
                    <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-black/50">Account</div>
                    <div className="text-sm font-bold font-mono text-amber-900 mt-2 capitalize">{profile.role}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ASSESSMENTS GIVEN BY PARTICIPANT */}
        <div className="rounded-2xl border border-black/10 bg-[#faf7f1] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-black/[0.02] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-[#1c1b19] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#68765d]" />
                {isTeacherProfile ? "Assessments Authored" : `Assessments Completed (${assessments.length})`}
              </h2>
              <p className="text-xs text-black/50 mt-0.5">
                {isTeacherProfile 
                  ? "Assessments published or managed by this evaluator."
                  : "Comprehensive record of tests and evaluations taken by this participant."}
              </p>
            </div>
          </div>

          {!isTeacherProfile ? (
            /* Participant Assessment List */
            assessments.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <BookOpen className="h-10 w-10 text-black/25 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-black/80">No assessments taken yet</h3>
                <p className="text-xs text-black/50 font-mono mt-1 max-w-sm mx-auto">
                  When this participant completes assessments, their scores, submission dates, and integrity audits will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-black/10 bg-black/[0.03] text-black/60 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-6">Assessment</th>
                      <th className="py-3 px-4">Date & Duration</th>
                      <th className="py-3 px-4">{isStaffViewer ? "Score / Marks" : "Questions Solved"}</th>
                      <th className="py-3 px-4">Integrity Audit</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/5">
                    {assessments.map((a) => (
                      <tr key={a.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-semibold text-[#1c1b19] flex items-center gap-2">
                            <span>{a.title}</span>
                            {a.testCode && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/5 text-black/70 border border-black/10 uppercase">
                                {a.testCode}
                              </span>
                            )}
                          </div>
                          {a.createdBy && (
                            <p className="text-[11px] text-black/50 font-mono mt-1">
                              By: {a.createdBy.name}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#1c1b19] flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-black/40" />
                            {a.submittedAt 
                              ? new Date(a.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </div>
                          <div className="text-[11px] text-black/50 font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-black/40" />
                            {a.durationMinutes ? `${a.durationMinutes} mins` : "Standard"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isStaffViewer ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#1c1b19]">
                                {a.score} / {a.total}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${getScoreBadgeClasses(a.percentage)}`}>
                                {a.percentage}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#1c1b19]">
                              <CheckCircle2 className="h-4 w-4 text-[#68765d]" />
                              <span>{a.questionsSolved ?? 0} / {a.totalQuestions ?? "—"} solved</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {getIntegrityBadge(a.integrityStatus, a.tabSwitches, a.fullscreenExits)}
                        </td>

                        <td className="py-3.5 px-6 text-right">
                          {isStaffViewer ? (
                            <NavLink
                              to={`/admin/test/${a.testId}/performance`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/5 hover:bg-black/10 text-[#1c1b19] border border-black/10 transition"
                            >
                              <span>Test Analytics</span>
                              <ExternalLink className="h-3 w-3" />
                            </NavLink>
                          ) : (
                            <NavLink
                              to={`/test/${a.testId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/5 hover:bg-black/10 text-[#1c1b19] border border-black/10 transition"
                            >
                              <span>View Test</span>
                              <ExternalLink className="h-3 w-3" />
                            </NavLink>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Evaluator Assessments Authored */
            testsCreated.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <FileText className="h-10 w-10 text-black/25 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-black/80">No assessments created yet</h3>
                <p className="text-xs text-black/50 font-mono mt-1 max-w-sm mx-auto">
                  Assessments created by this evaluator will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-black/10 bg-black/[0.03] text-black/60 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-6">Assessment</th>
                      <th className="py-3 px-4">Marks & Duration</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/5">
                    {testsCreated.map((t) => {
                      const isEnded = t.endsAt && new Date(t.endsAt).getTime() < Date.now();
                      return (
                        <tr key={t.id} className="hover:bg-black/[0.02] transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="font-semibold text-[#1c1b19] flex items-center gap-2">
                              <span>{t.title}</span>
                              {t.testCode && (
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/5 text-black/70 border border-black/10 uppercase">
                                  {t.testCode}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs text-black/70">
                            {t.totalMarks || 100} pts · {t.durationMinutes} mins
                          </td>

                          <td className="py-3.5 px-4 text-xs text-black/60 font-mono">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                          </td>

                          <td className="py-3.5 px-4">
                            {isEnded ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                Concluded
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Active / Scheduled
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            <NavLink
                              to={`/admin/test/${t.id}/performance`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/5 hover:bg-black/10 text-[#1c1b19] border border-black/10 transition"
                            >
                              <span>Performance</span>
                              <ExternalLink className="h-3 w-3" />
                            </NavLink>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Optional Section: Practice Problem Solutions (if any exist) */}
        {solvedProblems.length > 0 && (
          <div className="rounded-2xl border border-black/10 bg-[#faf7f1] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/10 bg-black/[0.02] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-black/70 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[#68765d]" />
                  Practice Directory Solved ({solvedProblems.length})
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-black/[0.03] text-black/60 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-6">Problem</th>
                    <th className="py-2.5 px-4">Difficulty</th>
                    <th className="py-2.5 px-4">Category</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {solvedProblems.map((p, i) => (
                    <tr key={i} className="hover:bg-black/[0.02] transition-colors">
                      <td className="py-2.5 px-6 font-medium text-[#1c1b19]">
                        {p.title}
                      </td>

                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium border capitalize bg-black/5 text-black/70 border-black/10">
                          {p.difficulty || "standard"}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-black/50 font-mono text-xs">
                        {p.tags || "General"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
