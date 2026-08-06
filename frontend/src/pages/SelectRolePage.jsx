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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await confirmRole(role);
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
