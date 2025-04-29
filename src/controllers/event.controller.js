import Event from "../models/event.model.js";
import Message from "../models/message.model.js";
import { asyncHandler, AppError } from "../middlewares/error.middleware.js";
import notificationService from "../services/notification.service.js";
import User from "../models/user.model.js";

// @desc    Get all events (admin)
// @route   GET /api/events
// @access  Private/Admin
export const getEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skipIndex = (page - 1) * limit;

  // Filter by status if provided
  const statusFilter = req.query.status ? { status: req.query.status } : {};

  const events = await Event.find(statusFilter)
    .populate("participants.user", "name email")
    .populate("createdBy", "name email")
    .populate("originatedFrom", "title")
    .limit(limit)
    .skip(skipIndex)
    .sort({ departureDateTime: 1 });

  const totalEvents = await Event.countDocuments(statusFilter);

  res.json({
    success: true,
    events,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalEvents / limit),
      totalEvents,
    },
  });
});

// @desc    Get user's events
// @route   GET /api/events/my-events
// @access  Private
export const getUserEvents = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const events = await Event.find({
    "participants.user": userId,
    status: "active",
  })
    .populate("participants.user", "name email")
    .populate("createdBy", "name email")
    .sort({ departureDateTime: 1 });

  res.json({
    success: true,
    count: events.length,
    events,
  });
});

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Private
export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate("participants.user", "name email")
    .populate("createdBy", "name email")
    .populate("originatedFrom");

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  // Check if user is participant or admin
  const isParticipant = event.participants.some(
    (p) => p.user._id.toString() === req.user._id.toString()
  );

  if (!isParticipant && req.user.role !== "admin") {
    throw new AppError("Not authorized to access this event", 403);
  }

  res.json({
    success: true,
    event,
  });
});

// @desc    Update event (admin only)
// @route   PUT /api/events/:id
// @access  Private/Admin
export const updateEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    departureDateTime,
    returnDateTime,
    payRate,
    status,
  } = req.body;

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  event.title = title || event.title;
  event.description = description || event.description;
  event.departureDateTime = departureDateTime || event.departureDateTime;
  event.returnDateTime = returnDateTime || event.returnDateTime;
  event.payRate = payRate || event.payRate;

  // Handle status change
  if (status && status !== event.status) {
    event.status = status;

    if (status === "completed" || status === "cancelled") {
      event.closedAt = Date.now();
    }
  }

  const updatedEvent = await event.save();

  res.json({
    success: true,
    event: updatedEvent,
  });
});

// @desc    Complete event (admin only)
// @route   PUT /api/events/:id/complete
// @access  Private/Admin
export const completeEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  if (event.status !== "active") {
    throw new AppError("This event is not active", 400);
  }

  event.status = "completed";
  event.closedAt = Date.now();
  event.returnDateTime = event.returnDateTime || Date.now();

  await event.save();

  for (const participant of event.participants) {
    await notificationService.sendToUser(
      participant.user,
      "event",
      "Event Completed",
      `Event "${event.title}" has been marked as completed`,
      {
        eventId: event._id.toString(),
        type: "event_completed",
      }
    );
  }

  // Create completion message
  await Message.create({
    sender: req.user._id,
    content: `Event "${event.title}" has been marked as completed.`,
    chatType: "event",
    eventId: event._id,
  });

  res.json({
    success: true,
    message: "Event marked as completed",
    event,
  });
});

// @desc    Cancel event (admin only)
// @route   PUT /api/events/:id/cancel
// @access  Private/Admin
export const cancelEvent = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  if (event.status !== "active") {
    throw new AppError("This event is not active", 400);
  }

  event.status = "cancelled";
  event.closedAt = Date.now();

  await event.save();

  // Notify all participants
  for (const participant of event.participants) {
    await notificationService.sendToUser(
      participant.user,
      "event",
      "Event Cancelled",
      `Event "${event.title}" has been cancelled${reason ? `: ${reason}` : ""}`,
      {
        eventId: event._id.toString(),
        type: "event_cancelled",
      }
    );
  }

  // Create cancellation message
  await Message.create({
    sender: req.user._id,
    content: `Event "${event.title}" has been cancelled. ${
      reason ? `Reason: ${reason}` : ""
    }`,
    chatType: "event",
    eventId: event._id,
  });

  res.json({
    success: true,
    message: "Event cancelled successfully",
    event,
  });
});

// @desc    Update participant status (admin only)
// @route   PUT /api/events/:id/participants/:userId
// @access  Private/Admin
export const updateParticipantStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["confirmed", "declined", "no_response"].includes(status)) {
    throw new AppError("Invalid status", 400);
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  const participant = event.participants.find(
    (p) => p.user.toString() === req.params.userId
  );

  if (!participant) {
    throw new AppError("Participant not found", 404);
  }
  // Get user details
  const user = await User.findById(req.params.userId);

  // Notify the user about status change
  if (user) {
    await notificationService.sendToUser(
      user._id,
      "event",
      "Event Participation Status Updated",
      `Your status for event "${event.title}" has been updated to ${status}`,
      {
        eventId: event._id.toString(),
        status: status,
        type: "participant_status",
      }
    );
  }

  participant.status = status;
  await event.save();

  res.json({
    success: true,
    message: "Participant status updated successfully",
    event,
  });
});
