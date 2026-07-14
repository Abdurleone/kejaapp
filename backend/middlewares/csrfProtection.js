import httpStatus from "../constants/httpStatus.js";
import env from "../config/env.js";
import ApiError from "../utils/apiError.js";
import parseCookies from "../utils/cookies.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const refreshPath = "/api/auth/refresh";

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

  // /api/auth/refresh is the one legitimate mutation that can never carry an
  // Authorization header - its whole purpose is to mint a new access token
  // once the old one has expired. Its own secret is the refresh token,
  // which getRefreshTokenFromRequest (authController.js) reads from the
  // body first. A body value can't be forged cross-site the way a cookie
  // can (an attacker can't read or guess it), so trust it the same way the
  // Authorization header is trusted elsewhere; only the cookie fallback
  // below is the forgeable path for this route.
  if (req.originalUrl?.startsWith(refreshPath) && req.body?.refreshToken) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);

  // Both cookies matter here, not just the access-token one: refresh falls
  // back to the refresh cookie the same way protect() falls back to the
  // access-token cookie, so it's just as forgeable if only the
  // access-token cookie is checked.
  if (cookies[env.authCookieName] || cookies[env.refreshCookieName]) {
    throw new ApiError(httpStatus.FORBIDDEN, "This request must be authenticated with an Authorization header");
  }

  next();
};

export default csrfProtection;
