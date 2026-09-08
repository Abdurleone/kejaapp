import mongoose from "mongoose";

const loginEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    // Only set when `user` is null - a failed attempt against an identifier
    // matching no account is still a credential-stuffing/enumeration signal
    // worth counting, even with nothing to reference.
    identifier: { type: String, default: null, trim: true },
    success: { type: Boolean, required: true, index: true },
    method: { type: String, enum: ["password", "google"], required: true },
    ipAddress: { type: String, trim: true },
  },
  { timestamps: true } // createdAt drives every date-bucketed analytics aggregation
);

// Supports the admin analytics range query ($match createdAt-in-range) plus a
// success/failure split within that range without a second index scan.
loginEventSchema.index({ createdAt: 1, success: 1 });

// Deliberately no TTL here (unlike AuthSession's `expires: 0`) - this is the
// durable historical log AuthSession can't provide, since it only tracks
// currently-active sessions. Unbounded by design for now; revisit with a
// retention/archival job once volume warrants it (see Roadmap.md's Next
// section).
const LoginEvent = mongoose.model("LoginEvent", loginEventSchema);

export default LoginEvent;
