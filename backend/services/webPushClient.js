import * as webPushModule from "web-push";

// web-push 4 is ESM-only with named exports and no default export. Re-exposing
// the two functions this app uses on a plain object (rather than importing the
// frozen module namespace everywhere) keeps a single mockable surface - the
// tests stub sendNotification via mock.method, which can't redefine a
// property on a module namespace object.
const webpush = {
  setVapidDetails: webPushModule.setVapidDetails,
  sendNotification: webPushModule.sendNotification,
};

export default webpush;
