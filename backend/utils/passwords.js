import bcrypt from "bcryptjs";
import env from "../config/env.js";

const hashPassword = (password) => bcrypt.hash(password, env.bcryptSaltRounds);

const comparePassword = (password, hashedPassword) => bcrypt.compare(password, hashedPassword);

// Login has to reject a nonexistent identifier in roughly the same time as
// a real one with a wrong password, or the response-time difference itself
// leaks which identifiers are registered - bcrypt.compare is deliberately
// slow, so skipping it entirely for a missing user (the natural short-
// circuit) responds measurably faster than running it for a real account.
// Hashed once and cached, not per call - the point is a consistent *cost*,
// not a real comparison the caller ever inspects the result of.
let dummyHashPromise;
const getDummyHash = () => {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("timing-normalization-only-never-a-real-password");
  }
  return dummyHashPromise;
};

const compareAgainstDummyHash = async (password) => {
  await comparePassword(password, await getDummyHash());
  return false;
};

export { compareAgainstDummyHash, comparePassword, hashPassword };
