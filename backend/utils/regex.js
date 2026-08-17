import httpStatus from "../constants/httpStatus.js";
import ApiError from "./apiError.js";

// Escapes regex metacharacters so a user-supplied search term is matched
// literally - without this, a query param could be crafted as a
// pathological regex (ReDoS) or as metacharacters that bypass a partial
// match filter.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Express's default query parser turns bracket notation (?county[$gt]=) into
// a nested object rather than a string - escapeRegExp's own .replace() call
// would throw an unhandled TypeError on that (objects have no .replace),
// surfacing as an ungraceful 500 instead of a clean validation error. The
// object could never reach the query either way (new RegExp() would also
// throw), so this isn't a real injection path - just a rough edge on
// malformed input. Wraps the type check + escape in one call so every
// free-text search filter gets it without repeating the guard.
const escapeRegExpQueryParam = (value, field) => {
  if (typeof value !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, `${field} must be a string`);
  }

  return escapeRegExp(value);
};

export { escapeRegExp, escapeRegExpQueryParam };
