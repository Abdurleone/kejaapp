import * as Sentry from "@sentry/node";
import env from "./config/env.js";

// Must be imported before any other module (server.js does this as its very
// first line) so Sentry's auto-instrumentation can patch things like the
// http module before they're used elsewhere.
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
  });
}

export default Sentry;
