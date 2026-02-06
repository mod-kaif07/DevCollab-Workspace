import jwt from "jsonwebtoken";
import redisClient from "../services/redis.service.js";
export const authUser = async (req, res, next) => {
  try {
    const token =
      req.cookies.token || req.header("Authorization").split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "No token, authorization denied" });
      return;
    }
    const isBlacklisted = await redisClient.get(token);
    if (isBlacklisted) {
      res.cookies("token", "");
      return res.status(401).json({ message: "Token is blacklisted" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (erroe) {
    res.status(401).json({ message: "Token is not valid" });
  }
};
