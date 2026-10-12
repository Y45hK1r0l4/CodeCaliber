import{ User} from "../models/user.model.js";
// import [Problem] from "../models/problem.model.js";

export const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({})
      .select("firstName lastName problemSolved emailId")
      .populate("problemSolved", "difficultyLevel");

    const leaderboard = users.map((user) => {
      const easyCount = user.problemSolved.filter(p => p.difficultyLevel === "easy").length;
      const mediumCount = user.problemSolved.filter(p => p.difficultyLevel === "medium").length;
      const hardCount = user.problemSolved.filter(p => p.difficultyLevel === "hard").length;

      const score =
        easyCount * 1 +
        mediumCount * 2 +
        hardCount * 4;

      return {
        userId: user._id,
        name: `${user.firstName}`,
        email: user.emailId,
        easyCount,
        mediumCount,
        hardCount,
        totalSolved: user.problemSolved.length,
        score,
      };
    });

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    return res.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
    });
  }
};

