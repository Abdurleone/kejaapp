import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["apartment", "bedsitter", "maisonette", "house", "studio", "other"],
      default: "apartment",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      rent: {
        type: Number,
        required: true,
        min: 0,
      },
      deposit: {
        type: Number,
        default: 0,
        min: 0,
      },
      agencyFee: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    location: {
      county: {
        type: String,
        trim: true,
      },
      town: {
        type: String,
        trim: true,
      },
      area: {
        type: String,
        trim: true,
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: undefined,
        },
      },
    },
    bedrooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    bathrooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        url: String,
        alt: String,
      },
    ],
    listedBy: {
      type: String,
      enum: ["owner", "agency"],
      default: "owner",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

propertySchema.index({ "location.coordinates": "2dsphere" });
propertySchema.index({ title: "text", description: "text", "location.area": "text" });

const Property = mongoose.model("Property", propertySchema);

export default Property;
