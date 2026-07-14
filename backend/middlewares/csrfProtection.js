import httpStatus from "../constants/httpStatus.js";
import env from "../config/env.js";
import ApiError from "../utils/apiError.js";
import parseCookies from "../utils/cookies.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// authMiddleware's protect() accepts either an Authorization header or the
// httpOnly session cookie, and that cookie is necessarily sameSite: "none"
// in production (the frontend and backend are on different origins there) -
// which means it rides along on cross-site requests too, the classic CSRF
// setup. Every real client here (web, mobile) already sends
// Authorization: Bearer on every authenticated call, so requiring it for
// state-changing requests closes the hole with no client-side change: the
// cookie stays valid for authenticating safe (GET) requests, it just stops
// being trusted on its own for mutations, which a forged cross-site request
// can never supply (it has no way to read the token to put it in a header).
const csrfProtection = (req, res, next) => {
  if (!unsafeMethods.has(req.method) || req.headers.authorization?.startsWith("Bearer ")) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);

  if (cookies[env.authCookieName]) {
    throw new ApiError(httpStatus.FORBIDDEN, "This request must be authenticated with an Authorization header");
  }

  next();
};

export default csrfProtection;
