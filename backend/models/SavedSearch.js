import mongoose from "mongoose";

const savedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
    radiusKm: {
      type: Number,
    },
    minRent: {
      type: Number,
    },
    maxRent: {
      type: Number,
    },
    county: {
      type: String,
      trim: true,
    },
    town: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["apartment", "bedsitter", "maisonette", "house", "studio", "other"],
    },
    bedrooms: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

savedSearchSchema.index({ user: 1, createdAt: -1 });

const SavedSearch = mongoose.model("SavedSearch", savedSearchSchema);

export default SavedSearch;
