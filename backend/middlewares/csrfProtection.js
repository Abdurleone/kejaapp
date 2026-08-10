import httpStatus from "../constants/httpStatus.js";
import env from "../config/env.js";
import ApiError from "../utils/apiError.js";
import parseCookies from "../utils/cookies.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const refreshPath = "/api/auth/refresh";
const csrfHeaderName = "x-csrf-token";

// Login/register/Google-auth establish a session; they can't require proof
// of one that doesn't exist yet. Blocking them here also created a real
// lockout: a browser carrying any stale-but-unexpired auth/refresh cookie
// (left over from a previous or desynced session) would fail this check
// before the request ever reached the login handler, with no way to get a
// fresh matching CSRF pair since the very endpoint that issues one was the
// thing being blocked. These take their own credentials (password/Google ID
// token) as proof instead - a cross-site forgery gains nothing an attacker
// doesn't already have, unlike a forged mutation on an authenticated session.
const authBootstrapPaths = new Set(["/api/auth/login", "/api/auth/register", "/api/auth/google"]);

// authMiddleware's protect() accepts either an Authorization header or the
// httpOnly session cookie, and that cookie is necessarily sameSite: "none"
// in production (the frontend and backend are on different origins there) -
// which means it rides along on cross-site requests too, the classic CSRF
// setup. Two things prove a mutation isn't a forged cross-site request:
// - Authorization: Bearer header (mobile, and any non-cookie API client) -
//   a forged request has no way to read the token to put it there.
// - a matching X-CSRF-Token header + csrfCookieName cookie pair (web) - the
//   cookie rides along automatically on a forged request same as the auth
//   cookie does, but Same-Origin Policy means an attacker's page can never
//   read its value to also send it as a header, so the two can only match
//   on a request the real frontend made itself.
const csrfProtection = (req, res, next) => {
  if (!unsafeMethods.has(req.method) || req.headers.authorization?.startsWith("Bearer ")) {
    return next();
  }

  if (authBootstrapPaths.has(req.originalUrl?.split("?")[0])) {
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
  const csrfCookie = cookies[env.csrfCookieName];
  const csrfHeader = req.headers[csrfHeaderName];

  if (csrfCookie && csrfHeader && csrfCookie === csrfHeader) {
    return next();
  }

  // Both auth cookies matter here, not just the access-token one: refresh
  // falls back to the refresh cookie the same way protect() falls back to
  // the access-token cookie, so it's just as forgeable if only the
  // access-token cookie is checked.
  if (cookies[env.authCookieName] || cookies[env.refreshCookieName]) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "This request must be authenticated with an Authorization header or a matching CSRF token"
    );
  }

  next();
};

export default csrfProtection;
