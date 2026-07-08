import { useState } from "react";
import { deleteCurrentAccount } from "../../app-utils.js";

export default function AccountPage({ currentUser, onAccountDeleted }) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation === "DELETE";

  const handleDelete = async () => {
    if (!canDelete || loading) return;

    setLoading(true);
    setError("");

    try {
      await deleteCurrentAccount();
      onAccountDeleted();
    } catch (err) {
      setError(err.message || "Account deletion failed");
      setLoading(false);
    }
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Account</h2>
          <p>Manage your KejaApp profile and data controls.</p>
        </div>
      </div>

      <div className="panel stack">
        <h3>Profile</h3>
        <div className="detail-grid">
          <span>
            <strong>Name</strong>
            {currentUser?.name || "Not set"}
          </span>
          <span>
            <strong>Username</strong>
            {currentUser?.username || "Not set"}
          </span>
          <span>
            <strong>Email</strong>
            {currentUser?.email || "Not set"}
          </span>
          <span>
            <strong>Role</strong>
            {currentUser?.role || "Not set"}
          </span>
          <span>
            <strong>Phone</strong>
            {currentUser?.phone || "Not set"}
          </span>
        </div>
      </div>

      <div className="panel stack danger-zone">
        <h3>Delete account</h3>
        <p className="muted-copy">
          Delete your profile, sessions, saved homes, notifications, inquiries, viewing requests, reviews, agency verification records, and any listings you own.
        </p>
        <label>
          Type DELETE to confirm
          <input
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button className="danger-button" type="button" disabled={!canDelete || loading} onClick={handleDelete}>
            {loading ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}
