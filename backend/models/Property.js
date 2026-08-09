import mongoose from "mongoose";

const propertyStatuses = ["draft", "available", "taken", "archived"];
const propertyTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const propertyListedByOptions = ["owner", "agency"];
const propertyViewingTypes = ["scheduled", "open"];

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
      enum: propertyTypes,
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
        fileName: String,
        mimeType: String,
        size: Number,
        storagePath: String,
        perceptualHash: String,
      },
    ],
    listedBy: {
      type: String,
      enum: propertyListedByOptions,
      default: "owner",
    },
    status: {
      type: String,
      enum: propertyStatuses,
      default: "available",
      index: true,
    },
    viewingType: {
      type: String,
      enum: propertyViewingTypes,
      default: "scheduled",
      index: true,
    },
    viewingInstructions: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    contact: {
      preferredMethod: {
        type: String,
        enum: ["phone", "email", "whatsapp", "inquiry"],
        default: "inquiry",
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      whatsapp: {
        type: String,
        trim: true,
      },
      availableHours: {
        type: String,
        trim: true,
        maxlength: 200,
      },
      notes: {
        type: String,
        trim: true,
        maxlength: 500,
      },
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
    freshnessNudgeSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

propertySchema.pre("validate", function syncAvailabilityWithStatus() {
  if (this.isModified("status")) {
    this.isAvailable = this.status === "available";
  } else if (this.isModified("isAvailable")) {
    this.status = this.isAvailable ? "available" : "taken";
  }
});

propertySchema.index({ "location.coordinates": "2dsphere" });
propertySchema.index({ title: "text", description: "text", "location.area": "text" });
propertySchema.index({ owner: 1, status: 1 });

const Property = mongoose.model("Property", propertySchema);

export { propertyListedByOptions, propertyStatuses, propertyTypes, propertyViewingTypes };
export default Property;
