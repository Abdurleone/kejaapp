import env from "../../config/env.js";
import * as localStorageDriver from "./localStorageDriver.js";
import * as s3StorageDriver from "./s3StorageDriver.js";

// Evaluated fresh on every call (not memoized) - tests mutate
// process.env.STORAGE_DRIVER then dynamically import fileStorageService.js
// per test file, and the driver selection must stay live for that pattern
// to keep working, matching how the code this replaced already re-read
// env.storageDriver on every call rather than caching it once.
const getDriver = () => (env.storageDriver === "s3" ? s3StorageDriver : localStorageDriver);

export { getDriver };
