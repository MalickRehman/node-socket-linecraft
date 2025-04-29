import Opportunity from "../models/opportunity.model.js";
import User from "../models/user.model.js";
import Event from "../models/event.model.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import { asyncHandler, AppError } from "../middlewares/error.middleware.js";
import activityService from "../services/activity.service.js";
import notificationService from "../services/notification.service.js";

export const getInterestedUsers = asyncHandler(async (req, res) => {
  // Find the opportunity by ID
  const opportunityId = req.params.id;
  const opportunity = await Opportunity.findById(opportunityId).populate(
    "interestedUsers.user",
    "_id name"
  );

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  // Filter interested users with status 'interested'
  const interestedUsers = opportunity.interestedUsers
    .filter((user) => user.status === "interested")
    .map((user) => ({
      _id: user.user._id,
      name: user.user.name,
    }));

  res.json({
    success: true,
    interestedUsers,
  });
});

// @desc    Create new opportunity (admin only)
// @route   POST /api/opportunities
// @access  Private/Admin
export const createOpportunity = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    availableSlots,
    departureDateTime,
    payRate,
    expiresAt,
  } = req.body;

  const opportunity = await Opportunity.create({
    title,
    description,
    availableSlots,
    departureDateTime,
    payRate,
    expiresAt,
    createdBy: req.user._id,
  });
  // Notify all users with opportunity updates enabled
  const users = await User.find({
    "notificationSettings.opportunityUpdates": true,
    isApproved: true,
    role: "user",
  });
  console.log(`Sending opportunity notifications to ${users.length} users`);

  // Track which users have been notified to avoid duplicates
  const notifiedUserIds = new Set();
  for (const user of users) {
    // Skip creator and already notified users
    if (
      user._id.toString() === req.user._id.toString() ||
      notifiedUserIds.has(user._id.toString())
    ) {
      continue;
    }

    // Add to set to prevent duplicate notifications
    notifiedUserIds.add(user._id.toString());

    await notificationService.sendToUser(
      user._id,
      "opportunity",
      "New Job Opportunity",
      `New opportunity available: ${title}`,
      {
        opportunityId: opportunity._id.toString(),
        type: "new_opportunity",
      }
    );
  }

  // Create an announcement message in global chat
  const announcement = await Message.create({
    sender: req.user._id,
    content: `New job opportunity: ${title}`,
    chatType: "global",
    linkedOpportunity: opportunity._id,
  });
  res.status(200).json({
    success: true,
    opportunity,
    announcement,
  });
});

// @desc    Get all opportunities
// @route   GET /api/opportunities
// @access  Private
export const getOpportunities = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skipIndex = (page - 1) * limit;

  // Filter by status if provided
  const statusFilter = req.query.status ? { status: req.query.status } : {};

  const opportunities = await Opportunity.find(statusFilter)
    .populate("createdBy", "name email")
    .limit(limit)
    .skip(skipIndex)
    .sort({ createdAt: -1 });

  const totalOpportunities = await Opportunity.countDocuments(statusFilter);

  res.json({
    success: true,
    opportunities,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalOpportunities / limit),
      totalOpportunities,
    },
  });
});

// @desc    Get opportunity by ID
// @route   GET /api/opportunities/:id
// @access  Private
export const getOpportunityById = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("interestedUsers.user", "name email");

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  res.json({
    success: true,
    opportunity,
  });
});

// @desc    Update opportunity (admin only)
// @route   PUT /api/opportunities/:id
// @access  Private/Admin
export const updateOpportunity = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    availableSlots,
    departureDateTime,
    payRate,
    status,
    expiresAt,
  } = req.body;

  const opportunity = await Opportunity.findById(req.params.id);

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  opportunity.title = title || opportunity.title;
  opportunity.description = description || opportunity.description;
  opportunity.availableSlots = availableSlots || opportunity.availableSlots;
  opportunity.departureDateTime =
    departureDateTime || opportunity.departureDateTime;
  opportunity.payRate = payRate || opportunity.payRate;
  opportunity.status = status || opportunity.status;
  opportunity.expiresAt = expiresAt || opportunity.expiresAt;

  const updatedOpportunity = await opportunity.save();

  res.json({
    success: true,
    opportunity: updatedOpportunity,
  });
});

// @desc    Delete opportunity (admin only)
// @route   DELETE /api/opportunities/:id
// @access  Private/Admin
export const deleteOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  await opportunity.deleteOne();

  res.json({
    success: true,
    message: "Opportunity deleted successfully",
  });
});

// @desc    Express interest in opportunity
// @route   POST /api/opportunities/:id/interest
// @access  Private
export const expressInterest = asyncHandler(async (req, res) => {
  const { interested } = req.body;
  const userId = req.user._id;

  const opportunity = await Opportunity.findById(req.params.id);

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  if (opportunity.status !== "open") {
    throw new AppError("This opportunity is no longer open", 400);
  }

  // Update user interest using the model method
  const interestStatus = interested ? "interested" : "not_interested";
  opportunity.updateUserInterest(userId, interestStatus);

  await opportunity.save();

  res.json({
    success: true,
    message: interested
      ? "Interest expressed successfully"
      : "Not interested marked successfully",
    opportunity,
  });
});

// @desc    Select/reject user for opportunity (admin only)
// @route   PUT /api/opportunities/:id/select/:userId
// @access  Private/Admin
export const selectUserForOpportunity = asyncHandler(async (req, res) => {
  const { select } = req.body;
  const opportunityId = req.params.id;
  const userId = req.params.userId;

  const opportunity = await Opportunity.findById(opportunityId);

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  // Check if opportunity is still open
  if (opportunity.status !== "open") {
    throw new AppError("This opportunity is no longer open", 400);
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Find the user in the interested users array
  const userInterest = opportunity.interestedUsers.find(
    (u) => u.user.toString() === userId.toString()
  );

  if (!userInterest) {
    throw new AppError(
      "User has not expressed interest in this opportunity",
      400
    );
  }

  // Update user status
  userInterest.status = select ? "selected" : "rejected";

  if (select) {
    // Create activity for job acceptance
    await activityService.createActivity({
      user: userId,
      type: "job_acceptance",
      relatedOpportunity: opportunity._id,
    });
  }
  // Updated notification for user
  if (select) {
    await notificationService.sendToUser(
      userId,
      "opportunity",
      "Job Application Selected",
      `You've been selected for "${opportunity.title}"`,
      {
        opportunityId: opportunity._id.toString(),
        type: "job_selection",
      }
    );
  } else {
    await notificationService.sendToUser(
      userId,
      "opportunity",
      "Job Application Update",
      `Your application for "${opportunity.title}" was not selected`,
      {
        opportunityId: opportunity._id.toString(),
        type: "job_rejection",
      }
    );
  }

  // In the closeOpportunity method, add:
  // Create activities for users who showed interest but were not selected
  const interestedUsers = opportunity.interestedUsers.filter(
    (user) => user.status === "interested" || user.status === "rejected"
  );

  for (const user of interestedUsers) {
    await activityService.createActivity({
      user: user.user,
      type: "job_closed",
      relatedOpportunity: opportunity._id,
    });
  }

  // Update filled slots count if selecting
  if (select) {
    opportunity.filledSlots += 1;

    // Check if all slots are now filled
    if (opportunity.isFull()) {
      opportunity.status = "filled";
    }
    await notificationService.sendToUser(
      userId,
      "opportunity",
      "Job Application Accepted",
      `You've been selected for "${opportunity.title}"`,
      {
        opportunityId: opportunity._id.toString(),
        type: "job_acceptance",
      }
    );
  } else if (userInterest.status === "selected") {
    // If previously selected, decrement filled slots
    opportunity.filledSlots = Math.max(0, opportunity.filledSlots - 1);
  }

  await opportunity.save();

  res.json({
    success: true,
    message: select
      ? "User selected successfully"
      : "User rejected successfully",
    opportunity,
  });
});

// @desc    Close opportunity and create event (admin only)
// @route   POST /api/opportunities/:id/close
// @access  Private/Admin
export const closeOpportunity = asyncHandler(async (req, res) => {
  const opportunityId = req.params.id;

  const opportunity = await Opportunity.findById(opportunityId);

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  // Check if opportunity can be closed
  if (opportunity.status !== "open" && opportunity.status !== "filled") {
    throw new AppError("This opportunity cannot be closed", 400);
  }

  // Get selected users
  const selectedUsers = opportunity.interestedUsers.filter(
    (user) => user.status === "selected"
  );

  if (selectedUsers.length === 0) {
    throw new AppError("No users have been selected for this opportunity", 400);
  }

  // Update opportunity status
  opportunity.status = "closed";
  await opportunity.save();

  // Create new event
  const event = await Event.create({
    title: opportunity.title,
    description: opportunity.description,
    departureDateTime: opportunity.departureDateTime,
    payRate: opportunity.payRate,
    participants: selectedUsers.map((user) => ({
      user: user.user,
      status: "confirmed",
    })),
    originatedFrom: opportunity._id,
    createdBy: req.user._id,
  });

  // Create chat room for the event
  const chatRoom = await Chat.create({
    participants: selectedUsers.map((user) => user.user),
    chatType: "event",
    eventId: event._id,
  });

  // Update event with chat room
  event.chatRoom = chatRoom._id;
  await event.save();

  // Notify participants about the new event
  for (const selectedUser of selectedUsers) {
    await notificationService.sendToUser(
      selectedUser.user,
      "event",
      "New Event Created",
      `Event "${event.title}" has been created and you're a participant`,
      {
        eventId: event._id.toString(),
        opportunityId: opportunity._id.toString(),
        type: "event_created",
      }
    );
  }

  // Create welcome message in event chat
  await Message.create({
    sender: req.user._id,
    content: `Welcome to the event: ${event.title}`,
    chatType: "event",
    eventId: event._id,
  });

  res.status(200).json({
    success: true,
    message: "Opportunity closed and event created successfully",
    opportunity,
    event,
  });
});

// @desc    Get opportunities the user has expressed interest in
// @route   GET /api/opportunities/interested
// @access  Private
export const getUserInterestedOpportunities = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skipIndex = (page - 1) * limit;
  const userId = req.user._id;

  // Find opportunities where the user is in the interestedUsers array
  const opportunities = await Opportunity.find({
    "interestedUsers.user": userId,
  })
    .populate("createdBy", "name email")
    .limit(limit)
    .skip(skipIndex)
    .sort({ createdAt: -1 });

  // Get the total count for pagination
  const totalOpportunities = await Opportunity.countDocuments({
    "interestedUsers.user": userId,
  });

  // Add user's specific interest status to each opportunity
  const opportunitiesWithInterestStatus = opportunities.map((opportunity) => {
    const opportunityObj = opportunity.toObject();

    // Find user's interest in this opportunity
    const userInterest = opportunity.interestedUsers.find(
      (interest) => interest.user.toString() === userId.toString()
    );

    // Add user's interest status to the opportunity object
    opportunityObj.userInterestStatus = userInterest
      ? userInterest.status
      : null;
    opportunityObj.userAppliedAt = userInterest ? userInterest.appliedAt : null;

    return opportunityObj;
  });

  res.json({
    success: true,
    opportunities: opportunitiesWithInterestStatus,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalOpportunities / limit),
      totalOpportunities,
    },
  });
});
