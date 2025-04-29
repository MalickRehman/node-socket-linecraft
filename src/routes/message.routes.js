import express from "express";
import {
  sendGlobalMessage,
  getGlobalMessages,
  sendPrivateMessage,
  getPrivateMessages,
  getPrivateChats,
  sendEventMessage,
  getEventMessages,
  getUnreadMessageCounts,
} from "../controllers/message.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protected routes
router.use(protect);

// Global messages
router.post("/global", sendGlobalMessage);
router.get("/global", getGlobalMessages);

// Private messages
router.post("/private/:recipientId", sendPrivateMessage);
router.get("/private/:userId", getPrivateMessages);
router.get("/chats", getPrivateChats);

// Event messages
router.post("/event/:eventId", sendEventMessage);
router.get("/event/:eventId", getEventMessages);

// Unread messages count
router.get("/unread", getUnreadMessageCounts);

export default router;
