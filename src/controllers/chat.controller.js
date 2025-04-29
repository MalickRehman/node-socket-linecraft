import { asyncHandler, AppError } from "../middlewares/error.middleware.js";
import Chat from "../models/chat.model.js";
import User from "../models/user.model.js";

// @desc    Create private Chat
// @route   POST /api/messages/chat/:recipientId
// @access  Private
export const CreatePrivateChat = asyncHandler(async (req, res) => {
  const senderId = req.user._id;
  const { recipientId } = req.body;

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new AppError("Recipient not found", 404);
  }

  // Check if sender is trying to message themselves
  if (senderId.toString() === recipientId.toString()) {
    throw new AppError("Cannot Create Chat with yourself", 400);
  }

  // Find or create chat
  let chat = await Chat.findOne({
    chatType: "private",
    participants: { $all: [senderId, recipientId], $size: 2 },
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [senderId, recipientId],
      chatType: "private",
    });
  }

  await chat.save();

  res.status(201).json({
    success: true,
    message: "Chat created successfully",
    chat,
  });
});
