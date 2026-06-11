import mongoose from "mongoose";

const inquiryStatuses = ["open", "responded", "closed"];
const contactPreferences = ["phone", "email", "in_app"];

const inquirySchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    contactPreference: {
      type: String,
      enum: contactPreferences,
      default: "in_app",
    },
    status: {
      type: String,
      enum: inquiryStatuses,
      default: "open",
      index: true,
    },
    response: {
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
  {
    timestamps: true,
  }
);

inquirySchema.index({ sender: 1, status: 1, createdAt: -1 });
inquirySchema.index({ owner: 1, status: 1, createdAt: -1 });

const Inquiry = mongoose.model("Inquiry", inquirySchema);

export { contactPreferences, inquiryStatuses };
export default Inquiry;
