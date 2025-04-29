import express from "express";
import {
  getEvents,
  getUserEvents,
  getEventById,
  updateEvent,
  completeEvent,
  cancelEvent,
  updateParticipantStatus,
} from "../controllers/event.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protected routes
router.use(protect);

// User routes
router.get("/my-events", getUserEvents);
router.get("/:id", getEventById);

// Admin routes
router.get("/", admin, getEvents);
router.put("/:id", admin, updateEvent);
router.put("/:id/complete", admin, completeEvent);
router.put("/:id/cancel", admin, cancelEvent);
router.put("/:id/participants/:userId", admin, updateParticipantStatus);

export default router;
