import mongoose from "mongoose";
import { roleList, roles } from "../constants/rbac.js";
import { comparePassword, hashPassword as hashUserPassword } from "../utils/passwords.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: roleList,
      default: roles.tenant,
    },
    phone: {
      type: String,
      trim: true,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },
    accountStatusReason: {
      type: String,
      trim: true,
    },
    accountStatusUpdatedAt: {
      type: Date,
    },
    /* --- RECOMMENDED ADDITION FOR REACT NATIVE PUSH --- */
    fcmTokens: [{
      token: { type: String, required: true },
      platform: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
      lastSeen: { type: Date, default: Date.now }
    }]
    /* -------------------------------------------------- */
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await hashUserPassword(this.password);
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return comparePassword(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
