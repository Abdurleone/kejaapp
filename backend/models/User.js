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
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Not required for accounts created via Google Sign-In (googleId set,
      // no password ever chosen) - required for every other account.
      required: function isPasswordRequired() {
        return !this.googleId;
      },
      minlength: 8,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    role: {
      type: String,
      enum: roleList,
      default: roles.tenant,
    },
    // False only for a brand-new Google signup, which supplies no role at
    // all - the frontend gates on this to force a one-time role-picker
    // screen before the account can do anything role-specific. True by
    // default so every pre-existing/local-registration user is unaffected.
    roleConfirmed: {
      type: Boolean,
      default: true,
    },
    // Set once, at whichever step first requires it (registerUser for a
    // direct signup, confirmRole for a Google signup's forced role-picker) -
    // never re-required afterward. Undefined for any account that existed
    // before this field did, same "grandfathered" convention as
    // roleConfirmed's default above - this isn't retroactively enforced.
    termsAcceptedAt: {
      type: Date,
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
    verified: {
      type: Boolean,
      default: false,
    },
    // Account-lockout brute-force guard, separate from the IP-based rate
    // limiter (middlewares/rateLimiter.js) - that one resets on IP rotation,
    // this one follows the account regardless of where attempts come from.
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
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
  // Google-only accounts have no password hash at all - bcrypt throws on a
  // missing hash instead of just returning false, so guard explicitly
  // rather than let a login attempt 500 instead of cleanly rejecting.
  if (!this.password) {
    return false;
  }

  return comparePassword(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
