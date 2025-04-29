import express from "express";
import {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
  expressInterest,
  selectUserForOpportunity,
  closeOpportunity,
  getUserInterestedOpportunities,
  getInterestedUsers,
} from "../controllers/opportunity.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protected routes
router.use(protect);

// User routes
router.get("/", getOpportunities);
router.get("/interested", getUserInterestedOpportunities); // New route for user's interested opportunities
router.get("/:id", getOpportunityById);
router.post("/interest/:id", expressInterest);

// Admin routes
router.post("/create", admin, createOpportunity);
router.put("/update/:id", admin, updateOpportunity);
router.delete("/delete/:id", admin, deleteOpportunity);
router.put("/select/:id/:userId", admin, selectUserForOpportunity);
router.post("/close/:id", admin, closeOpportunity);
router.get("/interested-users/:id", admin, getInterestedUsers);

export default router;
