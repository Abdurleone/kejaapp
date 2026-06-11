import bcrypt from "bcryptjs";
import env from "../config/env.js";

const hashPassword = (password) => bcrypt.hash(password, env.bcryptSaltRounds);

const comparePassword = (password, hashedPassword) => bcrypt.compare(password, hashedPassword);

export { comparePassword, hashPassword };
