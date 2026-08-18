import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

// MPESA_* must be set before config/env.js is first imported (by the dynamic
// import below), since env.js reads process.env once at module load - same
// constraint as the S3 config tests.
process.env.MPESA_CONSUMER_KEY = "test-consumer-key";
process.env.MPESA_CONSUMER_SECRET = "test-consumer-secret";
process.env.MPESA_SHORTCODE = "174379";
process.env.MPESA_PASSKEY = "test-passkey";
process.env.MPESA_CALLBACK_URL = "https://example.com/api/support-payments/callback";
process.env.MPESA_ENVIRONMENT = "sandbox";

const { getAccessToken, initiateStkPush, resetTokenCache } = await import("../../services/mpesaService.js");

describe("mpesaService", () => {
  it("fetches and caches an access token", async () => {
    resetTokenCache();
    const fetchMock = mock.method(globalThis, "fetch", async (url) => {
      assert.ok(String(url).includes("/oauth/v1/generate"));
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "token-1", expires_in: "3599" }),
      };
    });

    const first = await getAccessToken();
    const second = await getAccessToken();

    assert.equal(first, "token-1");
    assert.equal(second, "token-1");
    // Cached on the second call - only one real fetch, not two.
    assert.equal(fetchMock.mock.callCount(), 1);
    mock.restoreAll();
  });

  it("throws when the OAuth request fails", async () => {
    resetTokenCache();
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 401 }));

    await assert.rejects(() => getAccessToken(), { message: "Daraja OAuth request failed with status 401" });
    mock.restoreAll();
  });

  it("initiates an STK push with the expected request shape", async () => {
    resetTokenCache();
    const calls = [];
    mock.method(globalThis, "fetch", async (url, options) => {
      calls.push({ url: String(url), options });

      if (String(url).includes("/oauth/v1/generate")) {
        return { ok: true, status: 200, json: async () => ({ access_token: "token-1", expires_in: "3599" }) };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          MerchantRequestID: "merchant-1",
          CheckoutRequestID: "checkout-1",
          ResponseCode: "0",
          ResponseDescription: "Success. Request accepted for processing",
        }),
      };
    });

    const result = await initiateStkPush({
      phoneNumber: "254712345678",
      amount: 100,
      transactionDesc: "JakezApp Support",
    });

    assert.equal(result.CheckoutRequestID, "checkout-1");
    const stkCall = calls.find((call) => call.url.includes("/mpesa/stkpush/v1/processrequest"));
    assert.ok(stkCall);
    const body = JSON.parse(stkCall.options.body);
    assert.equal(body.BusinessShortCode, "174379");
    assert.equal(body.Amount, 100);
    assert.equal(body.PartyA, "254712345678");
    assert.equal(body.PhoneNumber, "254712345678");
    assert.equal(body.CallBackURL, "https://example.com/api/support-payments/callback");
    assert.equal(stkCall.options.headers.Authorization, "Bearer token-1");
    mock.restoreAll();
  });

  it("throws with Daraja's own error message when the STK push is rejected", async () => {
    resetTokenCache();
    mock.method(globalThis, "fetch", async (url) => {
      if (String(url).includes("/oauth/v1/generate")) {
        return { ok: true, status: 200, json: async () => ({ access_token: "token-1", expires_in: "3599" }) };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ ResponseCode: "1", errorMessage: "Invalid PartyA" }),
      };
    });

    await assert.rejects(
      () => initiateStkPush({ phoneNumber: "254712345678", amount: 100, transactionDesc: "JakezApp Support" }),
      { message: "Invalid PartyA" }
    );
    mock.restoreAll();
  });
});
