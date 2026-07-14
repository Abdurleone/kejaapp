jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: "test-project" } } } },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("../api/index.js", () => ({
  createDeviceToken: jest.fn(),
  deleteDeviceToken: jest.fn(),
}));

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("pushNotifications", () => {
  let getPermissionsAsync;
  let requestPermissionsAsync;
  let getExpoPushTokenAsync;
  let createDeviceToken;
  let deleteDeviceToken;
  let registerForPushNotifications;
  let unregisterForPushNotifications;

  beforeEach(() => {
    jest.resetModules();

    getPermissionsAsync = jest.fn().mockResolvedValue({ status: "granted" });
    requestPermissionsAsync = jest.fn().mockResolvedValue({ status: "granted" });
    getExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: "expo-token-1" });

    jest.doMock("expo-notifications", () => ({
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: (...args) => getPermissionsAsync(...args),
      requestPermissionsAsync: (...args) => requestPermissionsAsync(...args),
      getExpoPushTokenAsync: (...args) => getExpoPushTokenAsync(...args),
    }));

    ({ createDeviceToken, deleteDeviceToken } = require("../api/index.js"));
    createDeviceToken.mockReset().mockResolvedValue();
    deleteDeviceToken.mockReset().mockResolvedValue();

    ({ registerForPushNotifications, unregisterForPushNotifications } = require("./pushNotifications.js"));
  });

  it("registers a token and then unregisters it on logout", async () => {
    await registerForPushNotifications();
    expect(createDeviceToken).toHaveBeenCalledWith({ token: "expo-token-1", platform: "ios" });

    await unregisterForPushNotifications();
    expect(deleteDeviceToken).toHaveBeenCalledWith("expo-token-1");
  });

  it("does nothing on unregister when nothing was ever registered", async () => {
    await unregisterForPushNotifications();
    expect(deleteDeviceToken).not.toHaveBeenCalled();
  });

  it("waits for an in-flight registration before unregistering (race-condition guard)", async () => {
    // Simulates the real scenario: session-restore (or login) kicks off
    // registerForPushNotifications() in the background without awaiting
    // it, and the user logs out before that background call has finished
    // its own awaits (permission check, token fetch, createDeviceToken).
    const tokenCall = deferred();
    getExpoPushTokenAsync.mockImplementation(() => tokenCall.promise);

    const registerPromise = registerForPushNotifications();

    // At this point registeredToken is still null internally - the old
    // code's unregister would have no-opped here.
    const unregisterPromise = unregisterForPushNotifications();

    tokenCall.resolve({ data: "expo-token-2" });
    await Promise.all([registerPromise, unregisterPromise]);

    // The device must end up unregistered, not left registered under the
    // session that already logged out.
    expect(createDeviceToken).toHaveBeenCalledWith({ token: "expo-token-2", platform: "ios" });
    expect(deleteDeviceToken).toHaveBeenCalledWith("expo-token-2");
  });
});
