import User from "../models/user.model.js";
import { asyncHandler, AppError } from "../middlewares/error.middleware.js";
import notificationService from "../services/notification.service.js";

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skipIndex = (page - 1) * limit;

  const users = await User.find({ role: "user" })
    .select("-password")
    .limit(limit)
    .skip(skipIndex)
    .sort({ createdAt: -1 });

  const totalUsers = await User.countDocuments();

  res.json({
    success: true,
    users,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    },
  });
});

// @desc    Get pending approval users (admin only)
// @route   GET /api/users/pending
// @access  Private/Admin
export const getPendingUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isApproved: false })
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: users.length,
    users,
  });
});

// @desc    Approve or reject user (admin only)
// @route   PUT /api/users/:id/approval
// @access  Private/Admin
export const updateUserApproval = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Notify user about approval status
  await notificationService.sendToUser(
    user._id,
    "global", // Using global as the type since this is a system notification
    status
      ? "Your account has been approved. You can now use all features of the app."
      : "Your account has not been approved. Please contact admin for details.",
    {
      type: "account_status",
    }
  );

  user.isApproved = status;
  const updatedUser = await user.save();

  res.json({
    success: true,
    message: status
      ? "User approved successfully"
      : "User rejected successfully",
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
    },
  });
});

// @desc    Update user role (admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.role = role;
  const updatedUser = await user.save();

  res.json({
    success: true,
    message: `User role updated to ${role}`,
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
    },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.name = name;
  user.email = email;
  const updatedUser = await user.save();

  res.json({
    success: true,
    message: "User updated",
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
    },
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.password = newPassword;
  const updatedUser = await user.save();

  res.json({
    success: true,
    message: "Password updated",
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
    },
  });
});

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  await user.deleteOne();

  res.json({
    success: true,
    message: "User deleted successfully",
  });
});

// @desc    Get user by ID (admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({
    success: true,
    user,
  });
});

export const sendTestNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    type = "global",
    title = "Test Notification",
    message = "This is a test notification",
    data = {},
  } = req.body;

  if (!["global", "event", "private", "opportunity"].includes(type)) {
    throw new AppError(
      "Invalid notification type. Must be: global, event, private, or opportunity",
      400
    );
  }
  const notification = await notificationService.sendToUser(
    userId,
    type,
    title,
    message,
    data
  );

  res.status(200).json({
    success: true,
    message: "Test notification sent",
    notification,
  });
});
