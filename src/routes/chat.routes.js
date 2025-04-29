import express from "express";
import { CreatePrivateChat } from "../controllers/chat.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All feed routes are protected
router.use(protect);

// Mark feed activities as read
router.post("/create-chat", CreatePrivateChat);

export default router;
