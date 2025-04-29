import express from "express";
import {
  getUsers,
  getPendingUsers,
  updateUserApproval,
  updateUserRole,
  updateUser,
  updatePassword,
  deleteUser,
  getUserById,
  sendTestNotification,
} from "../controllers/user.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/send-test-notification", sendTestNotification);

// Admin-only routes
router.use(admin);

router.get("/", getUsers);
router.get("/pending", getPendingUsers);
router.get("/:id", getUserById);
router.put("/approve/:id", updateUserApproval);
router.put("/:id/role", updateUserRole);
router.put("/update/:id", updateUser);
router.put("/change-password/:id", updatePassword);
router.delete("/:id", deleteUser);

export default router;
