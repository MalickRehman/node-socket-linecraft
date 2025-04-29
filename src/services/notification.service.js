import User from "../models/user.model.js";
import logger from "../utils/logger.js";
import { io } from "../app.js";
/**
 * Service for handling push notifications in the application
 * This will be integrated with a real notification service like FCM in production
 */
class NotificationService {
  /**
   * Send a notification to a specific user
   * @param {string} userId - The ID of the user to notify
   * @param {string} type - The notification type (global, event, private, opportunity)
   * @param {string} title - The notification title
   * @param {string} body - The notification body
   * @param {Object} data - Additional data for the notification
   */
  async sendToUser(userId, type, title, body, data = {}) {
    try {
      // Get user notification preferences
      const user = await User.findById(userId);

      if (!user) {
        logger.error(`Failed to send notification: User ${userId} not found`);
        return;
      }

      // Check if user has enabled this notification type
      let settingKey = `${type}Messages`;
      if (type === "opportunity") {
        settingKey = "opportunityUpdates";
      }

      if (
        user.notificationSettings &&
        user.notificationSettings[settingKey] === false
      ) {
        // User has disabled this notification type
        return;
      }

      const notification = {
        userId,
        type,
        title,
        body,
        data,
        timestamp: new Date(),
      };

      // Log the notification
      logger.info(`NOTIFICATION to ${user.name}: ${title} - ${body}`);

      // Emit the notification via Socket.IO
      if (io && io.emitToUser) {
        io.emitToUser(userId.toString(), "notification", notification);
      }

      return notification;
    } catch (error) {
      logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send a notification to multiple users
   * @param {Array} userIds - Array of user IDs to notify
   * @param {string} type - The notification type
   * @param {string} title - The notification title
   * @param {string} body - The notification body
   * @param {Object} data - Additional data for the notification
   */
  async sendToUsers(userIds, type, title, body, data = {}) {
    const notifications = [];

    for (const userId of userIds) {
      const notification = await this.sendToUser(
        userId,
        type,
        title,
        body,
        data
      );
      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  }

  /**
   * Send a global notification
   * @param {string} title - The notification title
   * @param {string} body - The notification body
   * @param {Object} data - Additional data for the notification
   * @param {Array} excludeUserIds - User IDs to exclude from notification
   */
  async sendGlobalNotification(title, body, data = {}, excludeUserIds = []) {
    try {
      const users = await User.find({
        _id: { $nin: excludeUserIds },
        "notificationSettings.globalMessages": true,
      }).lean();

      const userIds = users.map((user) => user._id.toString());
      return await this.sendToUsers(userIds, "global", title, body, data);
    } catch (error) {
      logger.error(`Failed to send global notification: ${error.message}`);
    }
  }
}

export default new NotificationService();
