import * as Sentry from "@sentry/node";
import env from "./config/env.js";

// Must be imported before any other module (server.js does this as its very
// first line) so Sentry's auto-instrumentation can patch things like the
// http module before they're used elsewhere.
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    // @sentry/node 11 replaced `sendDefaultPii` with `dataCollection`, and
    // flipped the default: left unset, v11 ships cookies, request/response
    // bodies (login passwords, phone numbers), DB query data and user IPs to
    // Sentry. This is the v10 baseline spelled out explicitly, which is what
    // this app actually ran with before - see docs/compliance/
    // data-protection-policy.md for why nothing broader is acceptable here.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
        response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      },
      httpBodies: [],
      urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    },
  });
}

export default Sentry;
