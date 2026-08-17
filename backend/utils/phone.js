// Accepts the common ways a Kenyan number gets typed - 07XXXXXXXX/01XXXXXXXX,
// +2547XXXXXXXX/+2541XXXXXXXX, or already-normalized 2547XXXXXXXX/2541XXXXXXXX
// - and returns Daraja's required 2547XXXXXXXX/2541XXXXXXXX shape, or null if
// the input doesn't match any of them (safe-tristate rather than throwing, so
// callers decide how to surface that as a validation error).
const normalizeKenyanPhone = (value) => {
  const digits = String(value || "").replace(/[^\d]/g, "");

  if (/^0[71]\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^254[71]\d{8}$/.test(digits)) {
    return digits;
  }

  return null;
};

export { normalizeKenyanPhone };
