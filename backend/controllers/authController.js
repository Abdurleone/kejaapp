import { OAuth2Client } from "google-auth-library";
import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import { roleGroups } from "../constants/rbac.js";
import AuthSession from "../models/AuthSession.js";
import User from "../models/User.js";
import { deleteUserCascade } from "../services/userDeletionService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import parseCookies from "../utils/cookies.js";
import generateToken from "../utils/generateToken.js";
import { generateOpaqueToken, hashToken } from "../utils/tokens.js";
import { generateUniqueUsername, suggestUsernames } from "../utils/usernameGenerator.js";

// --- EXISTING UTILITIES ---
const getCookieOptions = () => ({
  httpOnly: true,
  maxAge: env.authCookieMaxAge,
  sameSite: env.authCookieSecure ? "none" : "lax",
  secure: env.authCookieSecure,
});

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  maxAge: env.refreshTokenMaxAge,
  sameSite: env.authCookieSecure ? "none" : "lax",
  secure: env.authCookieSecure,
});

// Deliberately not httpOnly - the frontend reads this value and echoes it
// back as an X-CSRF-Token header on mutations (csrfProtection.js checks the
// two match). Same maxAge as the access-token cookie since that's this
// app's actual session lifetime in practice (nothing currently calls
// POST /api/auth/refresh from either client).
const getCsrfCookieOptions = () => ({
  httpOnly: false,
  maxAge: env.authCookieMaxAge,
  sameSite: env.authCookieSecure ? "none" : "lax",
  secure: env.authCookieSecure,
});

const createRefreshSession = async (req, user) => {
  const refreshToken = generateOpaqueToken();

  await AuthSession.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + env.refreshTokenMaxAge),
  });

  return refreshToken;
};

const getRefreshTokenFromRequest = (req) => {
  // req.body is only populated when the request has a JSON body/Content-Type
  // (e.g. login/refresh calls with a payload); logout is called with neither,
  // so express.json() leaves req.body undefined here.
  if (req.body?.refreshToken) {
    return req.body.refreshToken;
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[env.refreshCookieName];
};

const sendAuthResponse = async (req, res, statusCode, user) => {
  const userId = user._id.toString();
  const token = generateToken({ id: userId, role: user.role });
  const refreshToken = await createRefreshSession(req, user);
  const csrfToken = generateOpaqueToken();

  res.cookie(env.authCookieName, token, getCookieOptions());
  res.cookie(env.refreshCookieName, refreshToken, getRefreshCookieOptions());
  res.cookie(env.csrfCookieName, csrfToken, getCsrfCookieOptions());

  res.status(statusCode).json({
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      roleConfirmed: user.roleConfirmed,
      phone: user.phone,
    },
    token,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresIn,
    // Web reads this from the response body, not the cookie: the cookie is
    // set by this (the backend's) origin, which is a DIFFERENT origin than
    // the one the frontend page runs on in production, so document.cookie
    // there can never see it - only this response body, which the frontend's
    // own fetch call reads regardless of which origin answered it. Mobile
    // ignores this field entirely (it authenticates via the Authorization
    // header, which csrfProtection.js exempts from the CSRF check outright).
    csrfToken,
  });
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, name, password, phone, role } = req.body;
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = req.body.username.trim().toLowerCase();

  const [existingEmail, existingUsername] = await Promise.all([
    User.findOne({ email: normalizedEmail }),
    User.findOne({ username: normalizedUsername }),
  ]);

  if (existingEmail) {
    throw new ApiError(httpStatus.CONFLICT, "A user with this email already exists");
  }

  if (existingUsername) {
    const suggestions = await suggestUsernames(User, normalizedUsername);
    throw new ApiError(httpStatus.CONFLICT, "Username is already taken", { suggestions });
  }

  let user;

  try {
    user = await User.create({
      email: normalizedEmail,
      name,
      username: normalizedUsername,
      password,
      phone,
      role,
    });
  } catch (err) {
    // Rare race: another registration claimed this exact username between our
    // check and this write. Tell the user, with fresh suggestions, instead of
    // silently swapping in a username they never chose.
    if (err.code === 11000 && err.keyPattern?.username) {
      const suggestions = await suggestUsernames(User, normalizedUsername);
      throw new ApiError(httpStatus.CONFLICT, "Username is already taken", { suggestions });
    }
    throw err;
  }

  await sendAuthResponse(req, res, httpStatus.CREATED, user);
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  await sendAuthResponse(req, res, httpStatus.OK, user);
});

const googleClient = new OAuth2Client();

const googleAuth = asyncHandler(async (req, res) => {
  if (!env.googleClientId) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, "Google sign-in is not configured");
  }

  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, "idToken is required");
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Google credential");
  }

  if (!payload?.email_verified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Google account email is not verified");
  }

  const { sub: googleId, email, name } = payload;
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({ googleId });

  if (!user) {
    // A Google-verified email matching an existing password account is the
    // same real person signing in a different way - link rather than error.
    user = await User.findOne({ email: normalizedEmail });

    if (user) {
      user.googleId = googleId;
      await user.save();
    }
  }

  if (!user) {
    const username = await generateUniqueUsername(User);

    user = await User.create({
      email: normalizedEmail,
      name: name || normalizedEmail,
      username,
      googleId,
      // Google supplies no role - default to the least-privileged option
      // and force a one-time role-picker via roleConfirmed: false. Never
      // grants a role from roleGroups.publicRegistration blindly beyond
      // this safe default.
      role: roleGroups.publicRegistration[0],
      roleConfirmed: false,
    });
  }

  await sendAuthResponse(req, res, httpStatus.OK, user);
});

const confirmRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  user.role = role;
  user.roleConfirmed = true;
  await user.save();

  res.status(httpStatus.OK).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      roleConfirmed: user.roleConfirmed,
      phone: user.phone,
    },
  });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token missing");
  }

  const session = await AuthSession.findOne({
    tokenHash: hashToken(refreshToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate("user");

  if (!session || !session.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token invalid");
  }

  if (session.user.accountStatus && session.user.accountStatus !== "active") {
    throw new ApiError(httpStatus.FORBIDDEN, "Account is not active");
  }

  session.revokedAt = new Date();
  session.lastUsedAt = new Date();
  await session.save();

  await sendAuthResponse(req, res, httpStatus.OK, session.user);
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // App.jsx calls this once on mount to restore the session after a reload -
  // the one place besides login/register/refresh a web client can relearn
  // the CSRF value it needs to echo back on the next mutation, since a page
  // reload resets client.js's in-memory copy to empty. Mobile authenticates
  // via the Authorization header (never has this cookie at all, since
  // csrfProtection.js exempts Bearer requests from CSRF entirely), so this
  // is simply omitted for those requests rather than minted unnecessarily.
  const cookies = parseCookies(req.headers.cookie);
  const csrfToken = cookies[env.csrfCookieName];

  res.status(httpStatus.OK).json({
    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
      roleConfirmed: req.user.roleConfirmed,
      phone: req.user.phone,
    },
    ...(csrfToken ? { csrfToken } : {}),
  });
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (req.body.name !== undefined) {
    user.name = req.body.name;
  }

  if (req.body.phone !== undefined) {
    user.phone = req.body.phone;
  }

  await user.save();

  res.status(httpStatus.OK).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      roleConfirmed: user.roleConfirmed,
      phone: user.phone,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!(await user.matchPassword(req.body.currentPassword))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Current password is incorrect");
  }

  user.password = req.body.newPassword;
  await user.save();

  // Changing the password is meant to lock out anyone holding a stolen
  // refresh token - revoke every other outstanding session, but keep the
  // caller's own current one alive so they aren't logged out mid-request.
  const currentRefreshToken = getRefreshTokenFromRequest(req);
  const currentTokenHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

  await AuthSession.updateMany(
    {
      user: user._id,
      revokedAt: null,
      ...(currentTokenHash ? { tokenHash: { $ne: currentTokenHash } } : {}),
    },
    { revokedAt: new Date() }
  );

  res.status(httpStatus.OK).json({
    message: "Password updated",
  });
});

const deleteCurrentUser = asyncHandler(async (req, res) => {
  await deleteUserCascade(req.user._id);

  res.clearCookie(env.authCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });
  res.clearCookie(env.csrfCookieName, {
    httpOnly: false,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });

  res.status(httpStatus.OK).json({
    message: "Account and associated data deleted",
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    await AuthSession.findOneAndUpdate(
      {
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      }
    );
  }

  res.clearCookie(env.authCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });
  res.clearCookie(env.csrfCookieName, {
    httpOnly: false,
    sameSite: env.authCookieSecure ? "none" : "lax",
    secure: env.authCookieSecure,
  });

  res.status(httpStatus.OK).json({
    message: "Logged out",
  });
});

export {
  changePassword,
  confirmRole,
  deleteCurrentUser,
  getCurrentUser,
  googleAuth,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateCurrentUser,
};
