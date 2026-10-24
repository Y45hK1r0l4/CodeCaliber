import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { axiosClient } from "../utils/axiosClient";
import { NavLink, useNavigate } from "react-router";
import { 
  Search, 
  Edit3, 
  Trash2,
  Plus,
  X,
  Code2, 
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Eye,
  Terminal,
  ExternalLink
} from "lucide-react";

const difficultyBadge = {
  easy: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  hard: "bg-rose-50 text-rose-800 border-rose-200",
};

export default function ProblemsPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    difficultyLevel: "all",
    tag: "all",
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const handleDeleteProblem = async (problemId, problemTitle) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${problemTitle}" from your Problem list?\n\nThis cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setDeletingId(problemId);
      await axiosClient.delete(`/problem/delete/${problemId}`);
      setProblems((prev) => prev.filter((p) => p._id !== problemId));
      setFeedback(`Question "${problemTitle}" was deleted.`);
      setTimeout(() => setFeedback(""), 3500);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete question.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await axiosClient.get("/admin/problems");
        setProblems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching problems:", err);
        setError(err.response?.data?.message || "Failed to load organization questions.");
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        problem.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(problem.tags) ? problem.tags.join(" ") : String(problem.tags || "")).toLowerCase().includes(searchQuery.toLowerCase());

      const difficultyMatch =
        filters.difficultyLevel === "all" ||
        problem.difficultyLevel?.toLowerCase() === filters.difficultyLevel?.toLowerCase();

      const tagMatch =
        filters.tag === "all" ||
        (Array.isArray(problem.tags)
          ? problem.tags.some((t) => t.toLowerCase() === filters.tag.toLowerCase())
          : typeof problem.tags === "string"
          ? problem.tags.toLowerCase().includes(filters.tag.toLowerCase())
          : false);

      return matchesSearch && difficultyMatch && tagMatch;
    });
  }, [problems, searchQuery, filters]);

  const availableTags = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => set.add(t));
      } else if (p.tags) {
        String(p.tags).split(",").forEach((t) => set.add(t.trim()));
      }
    });
    return Array.from(set).filter(Boolean);
  }, [problems]);

  return (
    <div className="app-page py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div>
          <button
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/60 hover:text-black transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Header & Overview Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/10">
          <div>
            <h1 className="serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1b19]">
              Problem List
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#faf7f1] border border-black/10 px-4 py-2.5 rounded-xl text-right shadow-2xs">
              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-black/50">Total Problems</div>
              <div className="text-xl font-mono font-bold text-[#1c1b19] mt-0.5">
                {problems.length} Problems
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/createProblem")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#bd5b3d] hover:bg-[#a94e34] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Question</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 shadow-2xs">
            <span className="font-medium">{feedback}</span>
            <button onClick={() => setFeedback("")} className="hover:opacity-75 cursor-pointer">
              <X className="w-4 h-4 text-emerald-700" />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-900 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#faf7f1] border border-black/15 rounded-xl pl-9 pr-4 py-2 text-xs text-[#1c1b19] placeholder:text-black/40 focus:outline-none focus:border-black/30 shadow-2xs"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="sm:col-span-3">
            <select
              value={filters.difficultyLevel}
              onChange={(e) => setFilters({ ...filters, difficultyLevel: e.target.value })}
              className="w-full bg-[#faf7f1] border border-black/15 rounded-xl px-3 py-2 text-xs text-[#1c1b19] focus:outline-none focus:border-black/30 shadow-2xs"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Category/Tag Filter */}
          <div className="sm:col-span-3">
            <select
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              className="w-full bg-[#faf7f1] border border-black/15 rounded-xl px-3 py-2 text-xs text-[#1c1b19] focus:outline-none focus:border-black/30 shadow-2xs capitalize"
            >
              <option value="all">All Topics & Categories</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag} className="capitalize">
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Questions Table */}
        <div className="rounded-2xl border border-black/10 bg-[#faf7f1] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center font-mono text-xs text-black/50">
              Loading questions...
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="py-20 px-4 text-center">
              <BookOpen className="w-10 h-10 text-black/25 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-black/80">No questions found</h3>
              <p className="text-xs text-black/50 mt-1 max-w-sm mx-auto font-mono">
                {searchQuery || filters.difficultyLevel !== "all" || filters.tag !== "all"
                  ? "No questions match your current search and filter criteria."
                  : "Your organization hasn't added any coding questions to the library yet."}
              </p>
              <button
                onClick={() => navigate("/admin/createProblem")}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#bd5b3d] text-white text-xs font-semibold hover:bg-[#a94e34] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Author First Question</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-black/[0.03] text-black/60 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Question Title</th>
                    <th className="py-3 px-4 w-32">Difficulty</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-6 text-right w-56">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {filteredProblems.map((problem, index) => {
                    const tagsArray = Array.isArray(problem.tags)
                      ? problem.tags
                      : typeof problem.tags === "string"
                      ? problem.tags.split(",").map((t) => t.trim())
                      : [];

                    return (
                      <tr
                        key={problem._id}
                        className="hover:bg-black/[0.02] transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-black/40">
                          {index + 1}
                        </td>

                        <td className="py-3.5 px-4">
                          <NavLink
                            to={`/problem/${problem._id}`}
                            className="font-semibold text-[#1c1b19] hover:text-[#bd5b3d] text-left transition hover:underline group inline-flex items-center gap-1.5"
                            title="Open coding and submission workspace"
                          >
                            <span>{problem.title}</span>
                            <Eye className="w-3.5 h-3.5 text-black/30 group-hover:text-[#bd5b3d] opacity-0 group-hover:opacity-100 transition" />
                          </NavLink>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                              difficultyBadge[problem.difficultyLevel?.toLowerCase()] || "bg-black/5 text-black/70 border-black/10"
                            }`}
                          >
                            {problem.difficultyLevel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {tagsArray.length > 0 ? (
                              tagsArray.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 text-black/70 border border-black/10 uppercase"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-black/40 font-mono text-xs">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <NavLink
                              to={`/problem/${problem._id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-[#1c1b19] border border-black/10 transition"
                              title="Open coding workspace and problem submission page"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#bd5b3d]" />
                              <span>Preview</span>
                            </NavLink>

                            <NavLink
                              to={`/admin/editProblem/${problem._id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-[#1c1b19] border border-black/10 transition"
                              title="Edit question details and test cases"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                              <span>Edit</span>
                            </NavLink>

                            <button
                              type="button"
                              onClick={() => handleDeleteProblem(problem._id, problem.title)}
                              disabled={deletingId === problem._id}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition cursor-pointer disabled:opacity-50"
                              title="Permanently delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>{deletingId === problem._id ? "..." : "Delete"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
