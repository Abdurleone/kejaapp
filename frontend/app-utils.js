// Kept as a thin barrel so every existing import of "app-utils.js" (and every
// vi.mock("../app-utils.js", ...) call in the test suite) keeps working
// unchanged. The actual logic lives split by concern in ./app-utils/ - see
// that directory for the HTTP client, domain API calls, formatting helpers,
// and authorization/routing rules separately.
export * from "./app-utils/client.js";
export * from "./app-utils/api.js";
export * from "./app-utils/format.js";
export * from "./app-utils/access.js";
export * from "./app-utils/misc.js";
