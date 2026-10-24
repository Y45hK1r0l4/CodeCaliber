import React, { useEffect, useState } from "react";
import { axiosClient } from "../utils/axiosClient";
import Toast from "../components/Toaster";
import { useNavigate } from "react-router";
import { Trash2, Edit3, ArrowLeft, AlertTriangle } from "lucide-react";

export default function DeleteProblemsPage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/admin/problems");
      setProblems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch problems from database", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProblem = async (id) => {
    try {
      await axiosClient.delete(`/problem/delete/${id}`);
      showToast("Problem deleted successfully", "success");
      fetchProblems();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete problem", "error");
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  return (
    <div className="app-page py-10 px-4 sm:px-6 lg:px-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-zinc-850">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 mb-1">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>CATALOG MANAGEMENT</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Decommission Problems
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

        {/* Problem List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 text-center text-xs font-mono text-zinc-500">
              Loading challenges from cluster...
            </div>
          ) : problems.length === 0 ? (
            <div className="py-20 text-center text-xs text-zinc-500 font-mono">
              No problems found in catalog.
            </div>
          ) : (
            problems.map((problem) => (
              <div
                key={problem._id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition"
              >
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    {problem.title}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-1">
                    <span className="capitalize">Difficulty: {problem.difficultyLevel}</span>
                    <span>·</span>
                    <span>Tag: {Array.isArray(problem.tags) ? problem.tags.join(", ") : String(problem.tags || "")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/admin/editProblem/${problem._id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => deleteProblem(problem._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/80 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
