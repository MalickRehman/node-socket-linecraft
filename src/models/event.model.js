import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
    },
    departureDateTime: {
      type: Date,
      required: [true, "Departure date and time are required"],
    },
    returnDateTime: {
      type: Date,
    },
    payRate: {
      type: Number,
      required: [true, "Pay rate is required"],
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["confirmed", "declined", "no_response"],
          default: "confirmed",
        },
      },
    ],
    originatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
    },
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to update timestamps
eventSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
eventSchema.pre("remove", async function (next) {
  await Message.deleteMany({ eventId: this._id });
  next();
});

// Index for faster queries
eventSchema.index({ status: 1, departureDateTime: 1 });
eventSchema.index({ "participants.user": 1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;
