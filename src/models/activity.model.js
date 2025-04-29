import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["job_acceptance", "private_message", "job_message", "job_closed"],
      required: true,
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    relatedOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
    },
    relatedEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    read: {
      type: Boolean,
      default: false,
    },
    // For grouping similar notifications (e.g., multiple messages from same chat)
    groupKey: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index for finding and updating grouped activities
activitySchema.index({ user: 1, type: 1, groupKey: 1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
