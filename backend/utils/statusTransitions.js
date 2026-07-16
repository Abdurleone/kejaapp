import httpStatus from "../constants/httpStatus.js";
import ApiError from "./apiError.js";

// Only actor authorization was ever checked before applying a status change -
// an owner could "approve" a request that was already rejected/cancelled/
// completed, re-triggering notifications and stomping timestamps on an
// already-terminal record. allowedFromByTarget maps each reachable target
// status to the set of current statuses it may legally transition from.
const assertValidTransition = (currentStatus, nextStatus, allowedFromByTarget) => {
  const allowedFrom = allowedFromByTarget[nextStatus] || [];

  if (!allowedFrom.includes(currentStatus)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot change status from "${currentStatus}" to "${nextStatus}"`
    );
  }
};

export { assertValidTransition };
