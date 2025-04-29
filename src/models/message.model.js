import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
    },
    chatType: {
      type: String,
      enum: ["global", "private", "event"],
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    linkedOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ chatType: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ eventId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, createdAt: -1 }); // ✅ Faster chat message retrieval
messageSchema.index({ readBy: 1 }); // ✅ Quick lookup for unread messages

const Message = mongoose.model("Message", messageSchema);

export default Message;
