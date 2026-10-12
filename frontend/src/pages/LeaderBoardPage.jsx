import React, { useEffect, useState } from "react";
import { axiosClient } from "../utils/axiosClient";

export default function LeaderboardPage() {
  const [data, setData] = useState([]);

  const fetchLeaderboard = async () => {
    const res = await axiosClient.get("/leaderboard/all");
    setData(res.data.leaderboard);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* Title */}
      <h1 className="text-3xl font-bold mb-6 text-center text-black">
        Global Leaderboard
      </h1>

      {/* Table Container */}
      <div className="max-w-4xl mx-auto bg-white border rounded p-4 overflow-x-auto">
        <table className="w-full text-left text-sm">

          <thead className="bg-gray-100 border-b">
            <tr className="text-gray-700">
              <th className="p-3">Rank</th>
              <th className="p-3">User</th>
              <th className="p-3 text-center">Easy</th>
              <th className="p-3 text-center">Medium</th>
              <th className="p-3 text-center">Hard</th>
              <th className="p-3 text-center">Score</th>
            </tr>
          </thead>

          <tbody>
            {data.map((u, i) => (
              <tr
                key={u.userId}
                className="border-b hover:bg-gray-50"
              >
                <td className="p-3 font-bold text-black">
                  {i + 1}
                </td>

                <td className="p-3">
                  {u.name}
                </td>

                <td className="p-3 text-center text-green-600">
                  {u.easyCount}
                </td>

                <td className="p-3 text-center text-yellow-600">
                  {u.mediumCount}
                </td>

                <td className="p-3 text-center text-red-600">
                  {u.hardCount}
                </td>

                <td className="p-3 text-center font-semibold text-blue-600">
                  {u.score}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}