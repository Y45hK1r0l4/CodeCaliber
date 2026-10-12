import React, { useEffect, useState } from "react";
import { axiosClient } from "../utils/axiosClient";
import Toast from "../components/Toaster";
import { useNavigate } from "react-router";

export default function DeleteProblemsPage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all problems
  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/problem/getAllProblem");
      setProblems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch problems", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete function
  const deleteProblem = async (id) => {
    try {
      await axiosClient.delete(`/problem/delete/${id}`);
      showToast("Problem deleted successfully!", "success");
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
    <div className="min-h-screen bg-gray-100 px-6 py-10">

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">
          Delete Problems
        </h1>

        <button
          onClick={() => navigate("/admin")}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back
        </button>
      </div>

      {/* Problems List */}
      <div className="max-w-4xl mx-auto space-y-4">

        {loading ? (
          <p className="text-center text-gray-600">
            Loading problems...
          </p>
        ) : problems.length === 0 ? (
          <p className="text-center text-gray-500">
            No problems found.
          </p>
        ) : (
          problems.map((problem) => (
            <div
              key={problem._id}
              className="bg-white border rounded p-4"
            >
              <h2 className="text-lg font-semibold text-black">
                {problem.title}
              </h2>

              <div className="flex justify-between items-center mt-3">

                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Difficulty: </strong>
                    {problem.difficultyLevel}
                  </p>
                  <p>
                    <strong>Tag:</strong> {problem.tags}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/editProblem/${problem._id}`)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProblem(problem._id)}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>

              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}