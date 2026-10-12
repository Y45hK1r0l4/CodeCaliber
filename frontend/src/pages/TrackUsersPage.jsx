import React, { useEffect, useState } from "react";
import { axiosClient } from "../utils/axiosClient";
import { useNavigate } from "react-router";

export default function TrackUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosClient.get("/user/getAllUsers");
        setUsers(res.data.users || []);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 bg-gray-100">
        Loading users...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="max-w-6xl mx-auto bg-white border rounded p-6">
        
        {/* Header */}
        <h1 className="text-2xl font-bold mb-6 border-b pb-2 text-black">
          Track Users Performance
        </h1>

        {users.length === 0 ? (
          <p className="text-gray-500 text-center">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              
              <thead className="bg-gray-100 border-b">
                <tr className="text-gray-700">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Problems Solved</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium">
                      {user.firstName} {user.lastName || ""}
                    </td>

                    <td className="py-3 px-4 text-gray-600">
                      {user.emailId}
                    </td>

                    <td
                      className={`py-3 px-4 font-semibold ${
                        user.role === "admin"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {user.role}
                    </td>

                    <td className="py-3 px-4 text-center text-green-600 font-semibold">
                      {user.problemSolved?.length || 0}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => navigate(`/profile/${user._id}`)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        View Profile
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
  );
}