import mongoose from "mongoose";

const userStatusLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    previousStatus: {
      type: String,
      enum: ["active", "suspended", "banned"],
      required: true,
    },
    newStatus: {
      type: String,
      enum: ["active", "suspended", "banned"],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userStatusLogSchema.index({ user: 1, createdAt: -1 });
userStatusLogSchema.index({ changedBy: 1, createdAt: -1 });

const UserStatusLog = mongoose.model("UserStatusLog", userStatusLogSchema);

export default UserStatusLog;
