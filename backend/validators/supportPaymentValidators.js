import { normalizeKenyanPhone } from "../utils/phone.js";

// Safaricom's own C2B/STK per-transaction ceiling varies by shortcode
// configuration, but 150,000 is the commonly-documented default limit - a
// conservative app-level cap rather than relying on Daraja to be the only
// thing rejecting an absurd value.
const maxAmount = 150000;

const initiateSupportPaymentSchema = {
  phoneNumber: {
    required: true,
    type: "string",
    validate(value) {
      return normalizeKenyanPhone(value) ? null : "phoneNumber must be a valid Kenyan phone number";
    },
  },
  amount: {
    required: true,
    type: "number",
    validate(value) {
      if (!Number.isFinite(value) || value < 1) {
        return "amount must be at least 1";
      }

      if (value > maxAmount) {
        return `amount must be ${maxAmount} or less`;
      }

      if (!Number.isInteger(value)) {
        return "amount must be a whole number of KES (M-Pesa doesn't support fractional shillings)";
      }

      return null;
    },
  },
};

export { initiateSupportPaymentSchema, maxAmount };
