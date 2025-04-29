import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    availableSlots: {
      type: Number,
      required: [true, "Number of available slots is required"],
      min: [1, "Must have at least one available slot"],
    },
    filledSlots: {
      type: Number,
      default: 0,
    },
    departureDateTime: {
      type: Date,
      required: [true, "Departure date and time are required"],
    },
    payRate: {
      type: Number,
      required: [true, "Pay rate is required"],
    },
    status: {
      type: String,
      enum: ["open", "filled", "closed", "cancelled"],
      default: "open",
    },
    interestedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["interested", "not_interested", "selected", "rejected"],
          default: "interested",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ✅ Ensure `filledSlots` never exceeds `availableSlots`
opportunitySchema.pre("save", function (next) {
  if (this.filledSlots > this.availableSlots) {
    return next(new Error("Filled slots cannot exceed available slots"));
  }
  next();
});

// ✅ Automatically set `status` to `filled` when all slots are taken
opportunitySchema.pre("save", function (next) {
  if (this.filledSlots >= this.availableSlots && this.status === "open") {
    this.status = "filled";
  }
  next();
});

// ✅ Method to check if opportunity is full
opportunitySchema.methods.isFull = function () {
  return this.filledSlots >= this.availableSlots;
};

// ✅ Method to get user's interest status
opportunitySchema.methods.getUserInterestStatus = function (userId) {
  const userInterest = this.interestedUsers.find(
    (interest) => interest.user.toString() === userId.toString()
  );
  return userInterest ? userInterest.status : null;
};

// ✅ Method to get selected users
opportunitySchema.methods.getSelectedUsers = function () {
  return this.interestedUsers.filter((user) => user.status === "selected");
};

// ✅ Method to update user interest
opportunitySchema.methods.updateUserInterest = function (
  userId,
  interestStatus
) {
  const existingInterest = this.interestedUsers.find(
    (interest) => interest.user.toString() === userId.toString()
  );

  if (existingInterest) {
    existingInterest.status = interestStatus;
    existingInterest.appliedAt = Date.now();
  } else {
    this.interestedUsers.push({
      user: userId,
      status: interestStatus,
      appliedAt: Date.now(),
    });
  }

  return this;
};

// ✅ Indexing for faster queries
opportunitySchema.index({ status: 1, createdAt: -1 });
opportunitySchema.index({ createdBy: 1 });
opportunitySchema.index({ expiresAt: 1 });
opportunitySchema.index({
  "interestedUsers.user": 1,
  "interestedUsers.status": 1,
});

const Opportunity = mongoose.model("Opportunity", opportunitySchema);

export default Opportunity;
