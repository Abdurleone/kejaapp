import { useState } from "react";
import { confirmRole } from "../../app-utils.js";

const roleOptions = [
  { value: "tenant", label: "Tenant - I'm looking for a place to rent" },
  { value: "landlord", label: "Landlord - I own properties to rent out" },
  { value: "agency", label: "Agency - I manage properties for owners" },
  { value: "mover", label: "Mover - I offer moving services" },
];

export default function SelectRolePage({ onRoleConfirmed }) {
  const [role, setRole] = useState("tenant");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!termsAccepted) {
      setError("You must agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);

    try {
      const user = await confirmRole(role, termsAccepted);
      onRoleConfirmed(user);
    } catch (err) {
      setError(err.message || "Could not save your role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>One more thing</h2>
          <p>Tell us how you&apos;ll be using KejaApp. This can&apos;t be changed yourself afterward.</p>
        </div>
      </div>

      <section className="panel stack">
        <form className="stack" onSubmit={handleSubmit}>
          <label>
            I am a
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
            />
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy &amp; Data Protection Policy
            </a>
            .
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
