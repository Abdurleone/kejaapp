import env from "../config/env.js";

const baseUrls = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

const getBaseUrl = () => baseUrls[env.mpesaEnvironment];

// Daraja access tokens last ~3599s; cached with a safety margin so a request
// straddling expiry never gets handed a token that expires mid-flight.
const tokenSafetyMarginMs = 60 * 1000;
let cachedToken = null;
let cachedTokenExpiresAt = 0;

const fetchAccessToken = async () => {
  const credentials = Buffer.from(`${env.mpesaConsumerKey}:${env.mpesaConsumerSecret}`).toString("base64");

  const response = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) {
    throw new Error(`Daraja OAuth request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload;
};

const getAccessToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const { access_token: accessToken, expires_in: expiresInSeconds } = await fetchAccessToken();

  cachedToken = accessToken;
  cachedTokenExpiresAt = Date.now() + Number(expiresInSeconds) * 1000 - tokenSafetyMarginMs;

  return cachedToken;
};

// YYYYMMDDHHmmss in the shortcode's local time - Daraja rejects the request
// outright if this drifts from server time, so this deliberately uses the
// same instant Buffer.from(...) below encodes, not a separately-computed one.
const formatDarajaTimestamp = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
};

// Initiates the STK push (the on-phone PIN prompt); this only confirms
// Safaricom *accepted the request for processing*, not that the tenant
// actually paid - the real outcome only arrives later, asynchronously, at
// MPESA_CALLBACK_URL (see supportPaymentController.js's handleMpesaCallback).
const initiateStkPush = async ({ phoneNumber, amount, transactionDesc }) => {
  const accessToken = await getAccessToken();
  const timestamp = formatDarajaTimestamp(new Date());
  const password = Buffer.from(`${env.mpesaShortcode}${env.mpesaPasskey}${timestamp}`).toString("base64");

  const response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: env.mpesaShortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: env.mpesaTransactionType,
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: env.mpesaShortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: env.mpesaCallbackUrl,
      // Daraja truncates/rejects values over ~12 and ~13 chars respectively -
      // the account owner's own account reference default is short by design.
      AccountReference: env.mpesaAccountReference.slice(0, 12),
      TransactionDesc: transactionDesc.slice(0, 13),
    }),
  });

  const payload = await response.json();

  if (!response.ok || payload.ResponseCode !== "0") {
    const message = payload.errorMessage || payload.ResponseDescription || `Daraja STK push failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

// Test-only: lets tests reset the module-level token cache between runs
// without needing to re-import the module (config/env.js's own
// process.env-read-once-at-load-time constraint doesn't apply here, since
// this cache is this module's own mutable state, not derived from env vars
// at import time).
const resetTokenCache = () => {
  cachedToken = null;
  cachedTokenExpiresAt = 0;
};

export { getAccessToken, initiateStkPush, resetTokenCache };
