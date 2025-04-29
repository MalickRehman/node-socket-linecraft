import express from "express";
import {
  getUserFeed,
  markActivitiesAsRead,
} from "../controllers/feed.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All feed routes are protected
router.use(protect);

// Get user's personalized feed
router.get("/", getUserFeed);

// Mark feed activities as read
router.put("/read", markActivitiesAsRead);

export default router;
