import mongoose from "mongoose";
import Property from "./Property.js";

const reviewSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    ownerResponse: {
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

reviewSchema.index({ property: 1, user: 1 }, { unique: true });

reviewSchema.statics.updatePropertyRating = async function updatePropertyRating(propertyId) {
  const [stats] = await this.aggregate([
    { $match: { property: propertyId } },
    {
      $group: {
        _id: "$property",
        ratingAverage: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  await Property.findByIdAndUpdate(propertyId, {
    ratingAverage: stats ? Number(stats.ratingAverage.toFixed(1)) : 0,
    ratingCount: stats ? stats.ratingCount : 0,
  });
};

reviewSchema.post("save", async function updateRatingAfterSave() {
  await this.constructor.updatePropertyRating(this.property);
});

reviewSchema.post("deleteOne", { document: true, query: false }, async function updateRatingAfterDelete() {
  await this.constructor.updatePropertyRating(this.property);
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;
