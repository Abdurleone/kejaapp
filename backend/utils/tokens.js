import crypto from "node:crypto";

const generateOpaqueToken = () => crypto.randomBytes(48).toString("base64url");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export { generateOpaqueToken, hashToken };
