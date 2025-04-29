import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { asyncHandler, AppError } from '../middlewares/error.middleware.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, address, isApproved } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new AppError('User already exists', 403);
  }

  let payload = {
    name,
    email,
    password,
    address,
  };

  if (isApproved) {
    payload = { ...payload, isApproved };
  }

  // Create new user
  const user = await User.create(payload);

  if (user) {
    res.status(200).json({
      success: true,
      message:
        user.isApproved === true
          ? 'Registration successful.'
          : 'Registration successful. Your account is pending approval.',
      user: {
        _id: user._id,
        name: user.firstName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } else {
    throw new AppError('Invalid user data', 400);
  }
});

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email }).select('+password');

  // Check if user exists and password matches
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is approved
  if (!user.isApproved) {
    throw new AppError('Your account is pending approval', 403);
  }

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
    },
    token: generateToken(user._id),
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role,
        notificationSettings: user.notificationSettings,
        isApproved: user.isApproved,
      },
    });
  } else {
    throw new AppError('User not found', 404);
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    // Update address if provided
    if (req.body.address) {
      user.address = {
        street: req.body.address.street || user.address.street,
        state: req.body.address.state || user.address.state,
        zipCode: req.body.address.zipCode || user.address.zipCode,
      };
    }

    // Update notification settings if provided
    if (req.body.notificationSettings) {
      user.notificationSettings = {
        globalMessages:
          req.body.notificationSettings.globalMessages ??
          user.notificationSettings.globalMessages,
        eventMessages:
          req.body.notificationSettings.eventMessages ??
          user.notificationSettings.eventMessages,
        privateMessages:
          req.body.notificationSettings.privateMessages ??
          user.notificationSettings.privateMessages,
        opportunityUpdates:
          req.body.notificationSettings.opportunityUpdates ??
          user.notificationSettings.opportunityUpdates,
      };
    }

    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        address: updatedUser.address,
        role: updatedUser.role,
        notificationSettings: updatedUser.notificationSettings,
        isApproved: updatedUser.isApproved,
      },
      token: generateToken(updatedUser._id),
    });
  } else {
    throw new AppError('User not found', 404);
  }
});
