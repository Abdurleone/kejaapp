import mongoose from "mongoose";

const feedbackStatuses = ["pending", "responded"];

const feedbackSchema = new mongoose.Schema(
  {
    submitter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: feedbackStatuses,
      default: "pending",
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    response: {
      message: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ submitter: 1, createdAt: -1 });
feedbackSchema.index({ isPublic: 1, "response.respondedAt": -1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export { feedbackStatuses };
export default Feedback;
