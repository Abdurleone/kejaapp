import httpStatus from "../constants/httpStatus.js";
import { roleList } from "../constants/rbac.js";
import LoginEvent from "../models/LoginEvent.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

const parseDays = (value) => {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return 30;
  return Math.min(Math.trunc(days), 365);
};

const getAdminAnalytics = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days);
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const dateMatch = { createdAt: { $gte: from, $lte: to } };

  const [usersByRole, signupsByDay, loginsByDay] = await Promise.all([
    // All-time snapshot, deliberately not range-limited - "total users by
    // role" is a point-in-time count, unlike the two trend arrays below.
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.aggregate([
      { $match: dateMatch },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    LoginEvent.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, success: "$success" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]),
  ]);

  const usersByRoleMap = Object.fromEntries(roleList.map((role) => [role, 0]));
  usersByRole.forEach(({ _id, count }) => {
    usersByRoleMap[_id] = count;
  });

  const loginsByDayMap = {};
  loginsByDay.forEach(({ _id, count }) => {
    const day = loginsByDayMap[_id.day] || (loginsByDayMap[_id.day] = { day: _id.day, success: 0, failed: 0 });
    day[_id.success ? "success" : "failed"] = count;
  });

  res.status(httpStatus.OK).json({
    data: {
      rangeDays: days,
      totalUsers: Object.values(usersByRoleMap).reduce((a, b) => a + b, 0),
      usersByRole: usersByRoleMap,
      signupsByDay: signupsByDay.map(({ _id, count }) => ({ day: _id, count })),
      loginsByDay: Object.values(loginsByDayMap),
    },
  });
});

export { getAdminAnalytics };
