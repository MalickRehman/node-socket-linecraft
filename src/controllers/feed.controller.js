import activityService from "../services/activity.service.js";
import { asyncHandler, AppError } from "../middlewares/error.middleware.js";

// @desc    Get user's personalized feed
// @route   GET /api/feed
// @access  Private
export const getUserFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const activities = await activityService.getUserFeed(userId, limit, skip);

  // Format activities for frontend display
  const formattedActivities = activities.map((activity) => {
    const formattedActivity = {
      _id: activity._id,
      type: activity.type,
      read: activity.read,
      createdAt: activity.createdAt,
      message: "",
      link: "",
    };

    // Format message and link based on activity type
    switch (activity.type) {
      case "job_acceptance":
        formattedActivity.message = `You've been accepted for ${
          activity.relatedOpportunity?.title || "a job opportunity"
        }!`;
        formattedActivity.link = `/jobs/${activity.relatedOpportunity?._id}`;
        break;

      case "private_message":
        formattedActivity.message = `New message from ${
          activity.relatedUser?.name || "a user"
        }`;
        formattedActivity.link = `/messaging/private/${activity.relatedUser?._id}`;
        break;

      case "job_message":
        formattedActivity.message = `New message in ${
          activity.relatedEvent?.title || "job"
        } channel`;
        formattedActivity.link = `/messaging/event/${activity.relatedEvent?._id}`;
        break;

      case "job_closed":
        formattedActivity.message = `Job "${
          activity.relatedOpportunity?.title || "opportunity"
        }" has been closed`;
        formattedActivity.link = `/my-jobs/${activity.relatedOpportunity?._id}`;
        break;

      default:
        formattedActivity.message = "New activity in your account";
        formattedActivity.link = "/";
    }

    return formattedActivity;
  });

  res.json({
    success: true,
    activities: formattedActivities,
    pagination: {
      page,
      limit,
      hasMore: activities.length === limit,
    },
  });
});

// @desc    Mark feed activities as read
// @route   PUT /api/feed/read
// @access  Private
export const markActivitiesAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { activityIds } = req.body;

  const result = await activityService.markActivitiesAsRead(
    userId,
    activityIds
  );

  res.json({
    success: true,
    message: "Activities marked as read",
    count: result.modifiedCount,
  });
});
