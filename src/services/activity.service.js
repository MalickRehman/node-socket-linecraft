import Activity from "../models/activity.model.js";
import logger from "../utils/logger.js";

class ActivityService {
  /**
   * Create a new activity in the user's feed
   *
   * @param {Object} activityData - Activity data
   * @param {string} activityData.user - User ID for whom to create activity
   * @param {string} activityData.type - Activity type
   * @param {string} [activityData.relatedUser] - Related user ID (for messages)
   * @param {string} [activityData.relatedOpportunity] - Related opportunity ID
   * @param {string} [activityData.relatedEvent] - Related event ID
   * @param {string} [activityData.groupKey] - Key for grouping similar activities
   * @returns {Promise<Object>} Created activity
   */
  async createActivity(activityData) {
    try {
      // For grouped activities (messages), we need to find and update or create new
      if (activityData.groupKey) {
        // Find existing activity with the same grouping
        const existingActivity = await Activity.findOne({
          user: activityData.user,
          type: activityData.type,
          groupKey: activityData.groupKey,
        });

        if (existingActivity) {
          // Update existing activity (bringing it to the top of the feed)
          existingActivity.createdAt = new Date();
          existingActivity.read = false;

          // Update related fields as needed
          if (activityData.relatedUser)
            existingActivity.relatedUser = activityData.relatedUser;
          if (activityData.relatedOpportunity)
            existingActivity.relatedOpportunity =
              activityData.relatedOpportunity;
          if (activityData.relatedEvent)
            existingActivity.relatedEvent = activityData.relatedEvent;

          await existingActivity.save();
          return existingActivity;
        }
      }

      // Create new activity
      const activity = await Activity.create(activityData);
      return activity;
    } catch (error) {
      logger.error(`Error creating activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's feed activities
   *
   * @param {string} userId - User ID
   * @param {number} [limit=20] - Number of activities to retrieve
   * @param {number} [skip=0] - Number of activities to skip
   * @returns {Promise<Array>} List of activities
   */
  async getUserFeed(userId, limit = 20, skip = 0) {
    try {
      const activities = await Activity.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("relatedUser", "name email")
        .populate("relatedOpportunity", "title")
        .populate("relatedEvent", "title");

      return activities;
    } catch (error) {
      logger.error(`Error getting user feed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark feed activities as read
   *
   * @param {string} userId - User ID
   * @param {Array<string>} [activityIds] - Optional specific activity IDs to mark as read
   * @returns {Promise<Object>} Update result
   */
  async markActivitiesAsRead(userId, activityIds = null) {
    try {
      const query = { user: userId };

      // If specific activity IDs are provided, add them to the query
      if (activityIds && activityIds.length > 0) {
        query._id = { $in: activityIds };
      }

      const result = await Activity.updateMany(query, { read: true });
      return result;
    } catch (error) {
      logger.error(`Error marking activities as read: ${error.message}`);
      throw error;
    }
  }
}

export default new ActivityService();
