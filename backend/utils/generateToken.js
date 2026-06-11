import jwt from "jsonwebtoken";
import env from "../config/env.js";

const generateToken = (payload) =>
  jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export default generateToken;
