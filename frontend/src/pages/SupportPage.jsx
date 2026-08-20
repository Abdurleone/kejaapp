import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchSupportPaymentStatus, initiateSupportPayment } from "../../app-utils.js";

// Safaricom's STK push prompt itself times out after ~60s if the user never
// responds on their phone - polling past that just confirms what's already
// true, so this stops a little past it rather than forever.
const pollIntervalMs = 3000;
const pollTimeoutMs = 90 * 1000;

const statusCopy = {
  completed: "Thank you! Your support payment went through.",
  failed: "That payment didn't go through - nothing was charged. Feel free to try again.",
  cancelled: "Payment cancelled - nothing was charged.",
};

export default function SupportPage() {
  const { currentUser } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || "");
  const [amount, setAmount] = useState("50");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);
  const pollRef = useRef(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    },
    []
  );

  const pollStatus = (paymentId, startedAt) => {
    pollRef.current = setTimeout(async () => {
      try {
        const updated = await fetchSupportPaymentStatus(paymentId);
        setPayment(updated);

        if (updated.status === "pending" && Date.now() - startedAt < pollTimeoutMs) {
          pollStatus(paymentId, startedAt);
        }
      } catch {
        // A transient poll failure isn't worth surfacing as an error - the
        // last known status stays on screen, and the user can always check
        // their M-Pesa messages directly for the definitive answer.
      }
    }, pollIntervalMs);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const created = await initiateSupportPayment({ phoneNumber, amount: Number(amount) });
      setPayment(created);
      pollStatus(created._id, Date.now());
    } catch (err) {
      setError(err.message || "Could not start that payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = payment?.status === "pending";

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Support KejaApp</h2>
          <p>
            A voluntary service charge to the developer who builds and maintains KejaApp - not rent, a deposit, or
            any agency/mover fee. Those always stay a direct matter between you and the other party; this is just an
            optional way to support the app itself.
          </p>
        </div>
      </div>

      <div className="panel stack">
        <form className="auth-panel-form" onSubmit={handleSubmit}>
          <label>
            M-Pesa phone number
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="0712345678"
              required
            />
          </label>
          <label>
            Amount (KES)
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={submitting || isPending}>
              {submitting ? "Sending prompt..." : "Pay via M-Pesa"}
            </button>
          </div>
        </form>

        {isPending && (
          <p className="muted-copy" role="status">
            Check your phone and enter your M-Pesa PIN to complete the payment.
          </p>
        )}
        {payment && payment.status !== "pending" && (
          <p className={payment.status === "completed" ? "success-text" : "error-text"}>
            {statusCopy[payment.status] || payment.resultDesc}
          </p>
        )}
      </div>
    </div>
  );
}
