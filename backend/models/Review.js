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
  // propertyId may be a populated Property document (e.g. if the caller ran
  // .populate("property") before .save()) rather than a plain ObjectId.
  // $match in a raw aggregation pipeline isn't auto-cast like a normal query,
  // so matching against anything but a real ObjectId silently returns no
  // rows here and would wipe out the property's rating.
  const id = new mongoose.Types.ObjectId(propertyId?._id || propertyId);

  const [stats] = await this.aggregate([
    { $match: { property: id } },
    {
      $group: {
        _id: "$property",
        ratingAverage: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  await Property.findByIdAndUpdate(id, {
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
