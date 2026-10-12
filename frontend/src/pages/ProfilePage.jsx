import React, { useEffect, useState } from "react";
import { axiosClient } from "../utils/axiosClient";
import { useParams } from "react-router";

const difficultyColor = {
  easy: "text-green-600 bg-green-100",
  medium: "text-yellow-600 bg-yellow-100",
  hard: "text-red-600 bg-red-100",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [rank, setRank] = useState("—");
  const [loading, setLoading] = useState(true);
  const { id } = useParams(); // for admin view

  useEffect(() => {
    (async () => {
      try {
        // 1️⃣ Fetch profile
        const endpoint = id ? `/user/getProfile/${id}` : "/user/getProfile";
        const profileRes = await axiosClient.get(endpoint);

        const userData = profileRes.data.data;
        setProfile(userData);

        // Safe extraction of user ID
        const userId =
          userData?._id || userData?.id || userData?.userId || null;

        if (!userId) {
          console.error("User ID missing in profile response!");
          return;
        }

        // 2️⃣ Fetch leaderboard
        const lbRes = await axiosClient.get("/leaderboard/all");
        const lb = lbRes.data.leaderboard;

        // 3️⃣ Assign ranks based on sorted order
        const ranked = lb.map((u, i) => ({
          ...u,
          rank: i + 1,
        }));

        // 4️⃣ Find this user's entry
        const entry = ranked.find(
          (u) => String(u.userId) === String(userId)
        );

        console.log("FOUND ENTRY:", entry);

        setRank(entry?.rank || "—");
      } catch (err) {
        console.error("Profile/Rank Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 bg-gray-100">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500 bg-gray-100">
        Failed to load profile.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="max-w-4xl mx-auto bg-white border rounded p-8">
        
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gray-800 text-3xl font-bold text-white">
            {profile.firstName[0].toUpperCase()}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-black">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-gray-600">{profile.emailId}</p>
            <p className="text-sm mt-1 px-2 py-1 bg-gray-200 inline-block rounded">
              Role: {profile.role}
            </p>
          </div>
        </div>

        {/* Stats section */}
        <div className="mb-10">
          <div className="bg-gray-50 border rounded p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg text-gray-600">Total Problems Solved</h2>
              <p className="text-3xl font-bold text-blue-600">
                {profile.totalSolved}
              </p>
            </div>

            {/* Rank Display */}
            <div className="text-right">
              <h2 className="text-lg text-gray-600">Rank</h2>
              <p className="text-3xl font-bold text-yellow-600">
                #{rank}
              </p>
            </div>
          </div>
        </div>

        {/* Solved Problems */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-black">
            Solved Problems
          </h2>

          {profile.problemsSolved.length === 0 ? (
            <p className="text-gray-500">No problems solved yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-gray-700 border-b">
                    <th className="py-3 px-2">Title</th>
                    <th className="py-3 px-2">Difficulty</th>
                    <th className="py-3 px-2">Tag</th>
                  </tr>
                </thead>

                <tbody>
                  {profile.problemsSolved.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-2 font-medium text-blue-600">
                        {p.title}
                      </td>

                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-1 rounded text-sm font-semibold ${difficultyColor[p.difficulty]}`}
                        >
                          {p.difficulty}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-gray-600">{p.tags}</td>
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