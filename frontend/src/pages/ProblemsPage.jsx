import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { axiosClient } from "../utils/axiosClient";
import { NavLink } from "react-router";

function ProblemsPage() {
  const { user } = useSelector((state) => state.auth);

  const [problems, setProblems] = useState([]);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [filters, setFilters] = useState({
    difficultyLevel: "all",
    tag: "all",
    status: "all",
  });

  const getDifficultyColor = (difficultyLevel) => {
    switch (difficultyLevel?.toLowerCase()) {
      case "easy":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "hard":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const { data } = await axiosClient.get("/problem/getAllProblem");
        setProblems(data);
      } catch (error) {
        console.log("Error fetching problems:", error);
      }
    };

    const fetchSolvedProblems = async () => {
      try {
        const { data } = await axiosClient.get("/problem/problemSolvedByUser");
        setSolvedProblems(data);
      } catch (error) {
        console.log("Error fetching solved problems:", error);
      }
    };

    fetchProblems();
    if (user) fetchSolvedProblems();
  }, [user]);

  const filteredProblems = problems.filter((problem) => {
    const difficultyMatch =
      filters.difficultyLevel === "all" ||
      problem.difficultyLevel === filters.difficultyLevel;

    const tagMatch =
      filters.tag === "all" ||
      (Array.isArray(problem.tags)
        ? problem.tags.includes(filters.tag)
        : typeof problem.tags === "string"
        ? problem.tags.split(",").includes(filters.tag)
        : false);

    const isSolved = solvedProblems.some((sp) => sp._id === problem._id);
    const statusMatch =
      filters.status === "all" ||
      (filters.status === "solved" && isSolved) ||
      (filters.status === "unsolved" && !isSolved);

    return difficultyMatch && tagMatch && statusMatch;

  });

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">Problems</h1>
          <p className="text-gray-600 text-sm">
            Solve problems and track your progress
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
        
          {/* Status Filter */}
            <select
              className="border border-gray-400 px-3 py-2 rounded text-sm bg-white"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All</option>
              <option value="solved">Solved</option>
              <option value="unsolved">Unsolved</option>
            </select>

            {/* Difficulty Filter */}
            <select
              className="border border-gray-400 px-3 py-2 rounded text-sm bg-white"
              value={filters.difficultyLevel}
              onChange={(e) =>
                setFilters({ ...filters, difficultyLevel: e.target.value })
              }
            >
              <option value="all">Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Tags Filter */}
            <select
              className="border border-gray-400 px-3 py-2 rounded text-sm bg-white"
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
            >
              <option value="all">Tags</option>
              <option value="array">Array</option>
              <option value="strings">String</option>
              <option value="linkedList">Linked List</option>
              <option value="graph">Graph</option>
              <option value="dp">DP</option>
            </select>

        </div>

        {/* Table */}
        <div className="bg-white border rounded overflow-hidden">
          {filteredProblems.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No problems found with current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-100">
                  <tr className="text-left text-gray-700">
                    <th className="px-4 py-3 w-12">Status</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3 w-32">Difficulty</th>
                    <th className="px-4 py-3">Tags</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProblems.map((problem, index) => {
                    const isSolved = solvedProblems.some(
                      (sp) => sp._id === problem._id
                    );
                    const difficultyColor = getDifficultyColor(
                      problem.difficultyLevel
                    );

                    return (
                      <tr
                        key={problem._id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          {isSolved ? (
                            <span className="text-green-600 text-lg">●</span>
                          ) : (
                            <span className="text-gray-400 text-lg">○</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <NavLink
                              to={`/problem/${problem._id}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {index + 1}. {problem.title}
                            </NavLink>
                            {user?.role === "admin" && (
                              <NavLink
                                to={`/admin/editProblem/${problem._id}`}
                                className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold shrink-0 transition"
                              >
                                ✏️ Edit
                              </NavLink>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`font-medium ${difficultyColor}`}>
                            {problem.difficultyLevel}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {(Array.isArray(problem.tags)
                              ? problem.tags
                              : typeof problem.tags === "string"
                              ? problem.tags.split(",").map((tag) => tag.trim())
                              : []
                            ).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 border rounded text-xs text-gray-600 bg-gray-100"
                              >
                                {tag}
                              </span>
                            ))}
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

export default ProblemsPage;