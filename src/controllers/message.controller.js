import Message from '../models/message.model.js';
import Chat from '../models/chat.model.js';
import User from '../models/user.model.js';
import Event from '../models/event.model.js';
import { asyncHandler, AppError } from '../middlewares/error.middleware.js';
import activityService from '../services/activity.service.js';
import notificationService from '../services/notification.service.js';

// @desc    Send global message
// @route   POST /api/messages/global
// @access  Private
export const sendGlobalMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  // Extract user mentions if any
  const mentionRegex = /@(\w+)/g;
  const mentionedUsernames = content.match(mentionRegex) || [];

  // Find mentioned users
  const mentions = [];
  if (mentionedUsernames.length > 0) {
    // Extract usernames without the @ symbol
    const usernames = mentionedUsernames.map((mention) => mention.substring(1));

    // Find users by name (case insensitive)
    const mentionedUsers = await User.find({
      name: { $in: usernames.map((name) => new RegExp(`^${name}$`, 'i')) },
    });

    // Add user IDs to mentions array
    mentions.push(...mentionedUsers.map((user) => user._id));
  }

  const senderId = req.user._id.toString();

  const message = await Message.create({
    sender: req.user._id,
    content,
    chatType: 'global',
    mentions,
    readBy: [senderId], // Sender has read the message
  });

  notificationService.sendGlobalNotification(
    // Not awaiting this action to let it fall into event loop and run it parallelly with next actions
    'New Global Message',
    `${req.user.name} sent a global message`,
    {
      senderId,
      messageId: message._id.toString(),
      chatType: 'global',
    },
    [senderId]
  );

  if (mentions.length > 0) {
    for (const mentionedUserId of mentions) {
      // Don't notify the sender about their own mentions
      if (mentionedUserId.toString() !== req.user._id.toString()) {
        await notificationService.sendToUser(
          mentionedUserId,
          'global',
          'You were mentioned',
          `${req.user.name} mentioned you in the global chat`,
          {
            messageId: message._id.toString(),
            senderId: req.user._id.toString(),
            chatType: 'global',
          }
        );
      }
    }
  }

  // Populate sender details
  await message.populate('sender', 'name email');
  await message.populate('mentions', 'name email');

  res.status(201).json({
    success: true,
    message,
  });
});

// @desc    Get global messages
// @route   GET /api/messages/global
// @access  Private
export const getGlobalMessages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skipIndex = (page - 1) * limit;

  const messages = await Message.find({ chatType: 'global' })
    .populate('sender', 'name email')
    .populate('mentions', 'name email')
    .populate('linkedOpportunity', 'title')
    .limit(limit)
    .skip(skipIndex)
    .sort({ createdAt: -1 });

  const totalMessages = await Message.countDocuments({ chatType: 'global' });

  // Mark messages as read by current user
  if (messages.length > 0) {
    await Message.updateMany(
      {
        _id: { $in: messages.map((m) => m._id) },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );
  }

  res.json({
    success: true,
    messages: messages.reverse(), // Return in chronological order
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    },
  });
});

// @desc    Send private message
// @route   POST /api/messages/private/:recipientId
// @access  Private
export const sendPrivateMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const senderId = req.user._id;
  const recipientId = req.params.recipientId;

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new AppError('Recipient not found', 404);
  }

  // Check if sender is trying to message themselves
  if (senderId.toString() === recipientId.toString()) {
    throw new AppError('Cannot send message to yourself', 400);
  }

  // Find or create chat
  let chat = await Chat.findOne({
    chatType: 'private',
    participants: { $all: [senderId, recipientId], $size: 2 },
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [senderId, recipientId],
      chatType: 'private',
    });
  }

  // Create message
  const message = await Message.create({
    sender: senderId,
    recipient: recipientId,
    content,
    chatType: 'private',
    readBy: [senderId], // Sender has read the message
  });

  // Update chat with last message
  chat.lastMessage = message._id;
  chat.updatedAt = Date.now();
  await chat.save();

  // Populate sender details
  await message.populate('sender', 'name email');
  await notificationService.sendToUser(
    recipientId,
    'private',
    'New message',
    `${req.user.name} sent you a message`,
    {
      messageId: message._id.toString(),
      senderId: senderId.toString(),
      chatId: chat._id.toString(),
    }
  );
  // Create activity for recipient's feed
  await activityService.createActivity({
    user: recipientId,
    type: 'private_message',
    relatedUser: senderId,
    groupKey: `private_${senderId}`, // Group by sender to ensure only the latest notification appears
  });

  res.status(201).json({
    success: true,
    message,
    chat,
  });
});

// @desc    Get private messages with a user
// @route   GET /api/messages/private/:userId
// @access  Private
export const getPrivateMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const otherUserId = req.params.userId;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skipIndex = (page - 1) * limit;

  // Check if chat exists
  const chat = await Chat.findOne({
    chatType: 'private',
    participants: { $all: [userId, otherUserId], $size: 2 },
  });

  if (!chat) {
    return res.json({
      success: true,
      messages: [],
      pagination: {
        page,
        limit,
        totalPages: 0,
        totalMessages: 0,
      },
    });
  }

  // Get messages
  const messages = await Message.find({
    chatType: 'private',
    $or: [
      { sender: userId, recipient: otherUserId },
      { sender: otherUserId, recipient: userId },
    ],
  })
    .populate('sender', 'name email')
    .limit(limit)
    .skip(skipIndex)
    .sort({ createdAt: -1 });

  const totalMessages = await Message.countDocuments({
    chatType: 'private',
    $or: [
      { sender: userId, recipient: otherUserId },
      { sender: otherUserId, recipient: userId },
    ],
  });

  // Mark messages as read by current user
  if (messages.length > 0) {
    await Message.updateMany(
      {
        _id: { $in: messages.map((m) => m._id) },
        sender: otherUserId,
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );
  }

  res.json({
    success: true,
    messages: messages.reverse(), // Return in chronological order
    otherUser: await User.findById(otherUserId).select('name email'),
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    },
  });
});

// @desc    Get private chats list
// @route   GET /api/messages/chats
// @access  Private
export const getPrivateChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const chats = await Chat.find({
    chatType: 'private',
    participants: userId,
  })
    .populate('participants', 'name email')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

  // Format response to show the other user in each chat
  const formattedChats = chats.map((chat) => {
    const otherUser = chat.participants.find(
      (participant) => participant._id.toString() !== userId.toString()
    );

    return {
      _id: chat._id,
      otherUser,
      lastMessage: chat.lastMessage,
      updatedAt: chat.updatedAt,
    };
  });

  res.json({
    success: true,
    chats: formattedChats,
  });
});

// @desc    Send event message
// @route   POST /api/messages/event/:eventId
// @access  Private
// export const sendEventMessage = asyncHandler(async (req, res) => {
//   const { content } = req.body;
//   const userId = req.user._id;
//   const eventId = req.params.eventId;

//   // Check if event exists
//   const event = await Event.findById(eventId);
//   if (!event) {
//     throw new AppError("Event not found", 404);
//   }

//   // Check if event is active
//   if (event.status !== "active") {
//     throw new AppError("This event is no longer active", 400);
//   }

//   // Check if user is participant or admin
//   const isParticipant = event.participants.some(
//     (p) => p.user.toString() === userId.toString()
//   );

//   if (!isParticipant && req.user.role !== "admin") {
//     throw new AppError("Not authorized to send messages to this event", 403);
//   }

//   // Extract user mentions if any
//   const mentionRegex = /@(\w+)/g;
//   const mentionedUsernames = content.match(mentionRegex) || [];

//   // Find mentioned users who are participants
//   const mentions = [];
//   if (mentionedUsernames.length > 0) {
//     // Get all participants
//     const participantIds = event.participants.map((p) => p.user);

//     // Extract usernames without the @ symbol
//     const usernames = mentionedUsernames.map((mention) => mention.substring(1));

//     // Find users by name who are participants
//     const mentionedUsers = await User.find({
//       _id: { $in: participantIds },
//       name: { $in: usernames.map((name) => new RegExp(`^${name}$`, "i")) },
//     });

//     // Add user IDs to mentions array
//     mentions.push(...mentionedUsers.map((user) => user._id));
//   }
//   if (mentions.length > 0) {
//     for (const mentionedUserId of mentions) {
//       // Don't notify the sender about their own mentions
//       if (mentionedUserId.toString() !== userId.toString()) {
//         await notificationService.sendToUser(
//           mentionedUserId,
//           "event",
//           "You were mentioned",
//           `${req.user.name} mentioned you in the ${event.title} chat`,
//           {
//             messageId: message._id.toString(),
//             senderId: userId.toString(),
//             eventId: eventId,
//             chatType: "event",
//           }
//         );
//       }
//     }
//   }
//   // Create message
//   const message = await Message.create({
//     sender: userId,
//     content,
//     chatType: "event",
//     eventId,
//     mentions,
//     readBy: [userId], // Sender has read the message
//   });

//   // Populate sender and mentions details
//   await message.populate("sender", "name email");
//   await message.populate("mentions", "name email");

//   res.status(201).json({
//     success: true,
//     message,
//   });
// });

export const sendEventMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user._id;
  const eventId = req.params.eventId;

  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check if event is active
  if (event.status !== 'active') {
    throw new AppError('This event is no longer active', 400);
  }

  // Check if user is participant or admin
  const isParticipant = event.participants.some(
    (p) => p.user.toString() === userId.toString()
  );

  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('Not authorized to send messages to this event', 403);
  }

  // Extract user mentions if any
  const mentionRegex = /@(\w+)/g;
  const mentionedUsernames = content.match(mentionRegex) || [];

  // Find mentioned users who are participants
  const mentions = [];
  if (mentionedUsernames.length > 0) {
    // Get all participants
    const participantIds = event.participants.map((p) => p.user);

    // Extract usernames without the @ symbol
    const usernames = mentionedUsernames.map((mention) => mention.substring(1));

    // Find users by name who are participants
    const mentionedUsers = await User.find({
      _id: { $in: participantIds },
      name: { $in: usernames.map((name) => new RegExp(`^${name}$`, 'i')) },
    });

    // Add user IDs to mentions array
    mentions.push(...mentionedUsers.map((user) => user._id));
  }

  // Create message FIRST, before sending notifications
  const message = await Message.create({
    sender: userId,
    content,
    chatType: 'event',
    eventId,
    mentions,
    readBy: [userId], // Sender has read the message
  });

  // Populate sender and mentions details
  await message.populate('sender', 'name email');
  await message.populate('mentions', 'name email');

  // Now send notifications to mentioned users
  if (mentions.length > 0) {
    for (const mentionedUserId of mentions) {
      // Don't notify the sender about their own mentions
      if (mentionedUserId.toString() !== userId.toString()) {
        await notificationService.sendToUser(
          mentionedUserId,
          'event',
          'You were mentioned',
          `${req.user.name} mentioned you in the ${event.title} chat`,
          {
            messageId: message._id.toString(),
            senderId: userId.toString(),
            eventId: eventId,
            chatType: 'event',
          }
        );

        // Create activity for mentioned user's feed
        await activityService.createActivity({
          user: mentionedUserId,
          type: 'event_mention',
          relatedUser: userId,
          eventId: eventId,
          groupKey: `event_${eventId}_mention`, // Group by event
        });
      }
    }
  }

  // Also notify all other participants about the new message
  const otherParticipants = event.participants
    .filter((p) => p.user.toString() !== userId.toString())
    .map((p) => p.user);

  for (const participantId of otherParticipants) {
    // Skip if this participant was already notified as a mention
    if (!mentions.some((id) => id.toString() === participantId.toString())) {
      await notificationService.sendToUser(
        participantId,
        'event',
        'New message in event',
        `${req.user.name} sent a message in ${event.title}`,
        {
          messageId: message._id.toString(),
          senderId: userId.toString(),
          eventId: eventId,
          chatType: 'event',
        }
      );
    }
  }

  res.status(201).json({
    success: true,
    message,
  });
});
// @desc    Get event messages
// @route   GET /api/messages/event/:eventId
// @access  Private
export const getEventMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const eventId = req.params.eventId;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skipIndex = (page - 1) * limit;

  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check if user is participant or admin
  const isParticipant = event.participants.some(
    (p) => p.user.toString() === userId.toString()
  );

  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('Not authorized to access this event', 403);
  }

  // Get messages
  const messages = await Message.find({
    chatType: 'event',
    eventId,
  })
    .populate('sender', 'name email')
    .populate('mentions', 'name email')
    .limit(limit)
    .skip(skipIndex)
    .sort({ createdAt: -1 });

  const totalMessages = await Message.countDocuments({
    chatType: 'event',
    eventId,
  });

  // Mark messages as read by current user
  if (messages.length > 0) {
    await Message.updateMany(
      {
        _id: { $in: messages.map((m) => m._id) },
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );
  }

  res.json({
    success: true,
    messages: messages.reverse(), // Return in chronological order
    event,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    },
  });
});

// @desc    Get unread message counts
// @route   GET /api/messages/unread
// @access  Private
export const getUnreadMessageCounts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Count unread global messages
  const globalUnread = await Message.countDocuments({
    chatType: 'global',
    sender: { $ne: userId },
    readBy: { $ne: userId },
  });

  // Count unread private messages
  const privateUnread = await Message.countDocuments({
    chatType: 'private',
    recipient: userId,
    readBy: { $ne: userId },
  });

  // Get user's events
  const userEvents = await Event.find({
    'participants.user': userId,
    status: 'active',
  });

  // Count unread event messages for each event
  const eventUnread = {};
  for (const event of userEvents) {
    const count = await Message.countDocuments({
      chatType: 'event',
      eventId: event._id,
      sender: { $ne: userId },
      readBy: { $ne: userId },
    });

    if (count > 0) {
      eventUnread[event._id] = count;
    }
  }

  res.json({
    success: true,
    unreadCounts: {
      global: globalUnread,
      private: privateUnread,
      events: eventUnread,
      total:
        globalUnread +
        privateUnread +
        Object.values(eventUnread).reduce((a, b) => a + b, 0),
    },
  });
});
