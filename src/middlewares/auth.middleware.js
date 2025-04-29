import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { AppError } from "./error.middleware.js";

export const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.exp * 1000 < Date.now()) {
        throw new AppError("Token expired. Please log in again.", 401);
      }
      // Find user and attach to request object (without password)
      const rawUser = await User.findById(decoded.id).select("-password");
      req.user = rawUser.toObject()

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user is approved
      if (!req.user.isApproved) {
        return res.status(403).json({
          success: false,
          message: "Your account is pending approval",
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
        stack: error.stack,
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token provided",
    });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Not authorized as an admin",
    });
  }
};
