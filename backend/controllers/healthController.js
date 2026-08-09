import httpStatus from "../constants/httpStatus.js";
import { getDBHealth, pingDB } from "../config/db.js";
import { logError } from "../utils/logger.js";

// These health endpoints are public and unauthenticated, so the live Mongo
// host/db name and any raw driver error message must never reach the
// client - both are only useful for local/internal debugging, and the full
// detail is still captured server-side via logError.
const redactDatabaseHealth = ({ host, name, path, ...redacted }) => redacted;

const getHealth = (req, res) => {
  const database = redactDatabaseHealth(getDBHealth());

  res.status(httpStatus.OK).json({
    status: database.status === "connected" ? "ok" : "degraded",
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

const getLiveness = (req, res) => {
  res.status(httpStatus.OK).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

const getReadiness = async (req, res) => {
  try {
    const database = await pingDB();

    res.status(database.ok ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE).json({
      status: database.ok ? "ready" : "not_ready",
      database: redactDatabaseHealth(database),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(`Readiness check failed: ${error.message}`);
    res.status(httpStatus.SERVICE_UNAVAILABLE).json({
      status: "not_ready",
      database: {
        ...redactDatabaseHealth(getDBHealth()),
        ok: false,
        message: "Database is not reachable",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

const getDatabaseHealth = async (req, res) => {
  try {
    const database = await pingDB();

    res.status(database.ok ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE).json({
      status: database.ok ? "ok" : "unavailable",
      database: redactDatabaseHealth(database),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(`Database health check failed: ${error.message}`);
    res.status(httpStatus.SERVICE_UNAVAILABLE).json({
      status: "unavailable",
      database: {
        ...redactDatabaseHealth(getDBHealth()),
        ok: false,
        message: "Database is not reachable",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

export { getDatabaseHealth, getHealth, getLiveness, getReadiness };
