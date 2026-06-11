import httpStatus from "../constants/httpStatus.js";
import { getDBHealth } from "../config/db.js";

const getHealth = (req, res) => {
  const database = getDBHealth();

  res.status(httpStatus.OK).json({
    status: database.status === "connected" ? "ok" : "degraded",
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

export { getHealth };
