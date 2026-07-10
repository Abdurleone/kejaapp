import mongoose from "mongoose";

const moverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    serviceTypes: [
      {
        type: String,
        enum: ["local", "long_distance", "packing", "storage", "office", "furniture"],
      },
    ],
    location: {
      county: {
        type: String,
        trim: true,
      },
      town: {
        type: String,
        trim: true,
      },
      areasServed: [
        {
          type: String,
          trim: true,
        },
      ],
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
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
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
    isAvailable: {
      type: Boolean,
      default: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    affiliatedOwners: [
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

moverSchema.index({ name: "text", "location.town": "text", "location.areasServed": "text" });
moverSchema.index({ serviceTypes: 1, isAvailable: 1, verified: 1 });
moverSchema.index({ "location.coordinates": "2dsphere" });
moverSchema.index({ affiliatedOwners: 1 });

const Mover = mongoose.model("Mover", moverSchema);

export default Mover;
