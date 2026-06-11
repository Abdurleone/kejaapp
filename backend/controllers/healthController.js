import httpStatus from "../constants/httpStatus.js";
import { getDBHealth, pingDB } from "../config/db.js";

const getHealth = (req, res) => {
  const database = getDBHealth();

  res.status(httpStatus.OK).json({
    status: database.status === "connected" ? "ok" : "degraded",
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

const getDatabaseHealth = async (req, res) => {
  try {
    const database = await pingDB();

    res.status(database.ok ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE).json({
      status: database.ok ? "ok" : "unavailable",
      database,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(httpStatus.SERVICE_UNAVAILABLE).json({
      status: "unavailable",
      database: {
        ...getDBHealth(),
        ok: false,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

export { getDatabaseHealth, getHealth };
