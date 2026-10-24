import React, { useEffect, useState } from "react";
import { axiosClient } from "../utils/axiosClient";
import { useNavigate } from "react-router";
import { Users, ArrowLeft, ExternalLink, ShieldAlert, User as UserIcon } from "lucide-react";

export default function TrackUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get("/user/getAllUsers");
        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-zinc-500 bg-zinc-950 font-mono text-xs">
        Auditing registered developers...
      </div>
    );
  }

  return (
    <div className="app-page py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-zinc-850">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 mb-1">
              <Users className="w-3.5 h-3.5 text-zinc-300" />
              <span>ACCESS & PERFORMANCE AUDIT</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Developer Telemetry & Accounts
            </h1>
          </div>

          <button
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Console</span>
          </button>
        </div>

        {/* User Table Container */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-xl overflow-hidden">
          {users.length === 0 ? (
            <div className="py-20 text-center text-xs text-zinc-500 font-mono">
              No registered user records returned by cluster.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-5">Developer</th>
                    <th className="py-3 px-5">Email Address</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Problems Solved</th>
                    <th className="py-3 px-5 text-right">Audit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800/50">
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-3 px-5 font-medium text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                          {user.firstName?.[0]?.toUpperCase() || "U"}
                        </div>
                        <button
                          onClick={() => navigate(`/profile/${user._id}`)}
                          className="hover:text-emerald-400 hover:underline transition cursor-pointer text-left"
                          title="View user profile"
                        >
                          {user.firstName} {user.lastName || ""}
                        </button>
                      </td>

                      <td className="py-3 px-5 text-zinc-400 font-mono text-xs">
                        {user.emailId}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider border ${
                            user.role === "admin"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : user.role === "evaluator"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {user.role === "participant" ? "Participant" : (user.role === "evaluator" ? "Evaluator" : "Admin")}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-white text-xs">
                        {user.problemSolved?.length || 0}
                      </td>

                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => navigate(`/profile/${user._id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                        >
                          <UserIcon className="w-3 h-3" />
                          <span>View Profile</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
