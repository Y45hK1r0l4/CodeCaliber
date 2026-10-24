import { userMiddleware } from "./user.middleware.js";

export const educatorMiddleware = async (req, res, next) => {
  await userMiddleware(req, res, () => {
    if (!req.result) return res.status(401).json({ message: "Authentication required" });
    const allowed = ["admin", "evaluator"];
    if (!allowed.includes(req.result.role)) {
      return res.status(403).json({ message: "Evaluator or Admin access required" });
    }
    next();
  });
};
