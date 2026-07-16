import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    // Revoked/expired sessions were never deleted (only revokedAt got set),
    // so this collection grew unbounded with every login/refresh. `expires: 0`
    // is Mongoose's shorthand for a TTL index that expires each document
    // exactly at its own `expiresAt` value, rather than N seconds after
    // insertion - MongoDB's background TTL monitor removes it automatically.
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

authSessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

const AuthSession = mongoose.model("AuthSession", authSessionSchema);

export default AuthSession;
