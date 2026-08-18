import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { usePushSubscription } from "../hooks/usePushSubscription.js";
import {
  changeCurrentUserPassword,
  deleteCurrentAccount,
  deleteSavedSearch,
  fetchSavedSearches,
  updateCurrentUser,
} from "../../app-utils.js";

function describeSavedSearch(savedSearch) {
  const parts = [];

  if (savedSearch.lat != null && savedSearch.lng != null) {
    parts.push(`within ${savedSearch.radiusKm || 5}km of a location`);
  }

  if (savedSearch.county) parts.push(`in ${savedSearch.county}`);
  if (savedSearch.town) parts.push(`near ${savedSearch.town}`);
  if (savedSearch.type) parts.push(savedSearch.type);
  if (savedSearch.bedrooms) parts.push(`${savedSearch.bedrooms}+ bed`);
  if (savedSearch.minRent || savedSearch.maxRent) {
    parts.push(`KES ${savedSearch.minRent || 0}-${savedSearch.maxRent || "any"}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Any listing";
}

function SavedSearchesPanel({ onBrowse }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchSavedSearches();
        if (active) setSavedSearches(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load your saved searches.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [retryKey]);

  const handleDelete = async (savedSearchId) => {
    setDeletingId(savedSearchId);
    setActionError("");

    try {
      await deleteSavedSearch(savedSearchId);
      setSavedSearches((current) => current.filter((item) => item._id !== savedSearchId));
    } catch (err) {
      setActionError(err.message || "Could not delete this saved search.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="panel stack">
      <h3>Saved searches</h3>
      <p className="muted-copy">We&apos;ll notify you when a new listing matches one of these.</p>
      {actionError && <p className="error-text">{actionError}</p>}
      {loading ? (
        <div className="stack" role="status" aria-label="Loading saved searches">
          <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="stack">
          <p className="error-text">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      ) : savedSearches.length === 0 ? (
        <>
          <p className="muted-copy">
            You have no saved searches yet. Save one from the Discover page&apos;s location filters.
          </p>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onBrowse}>
              Go to Discover
            </button>
          </div>
        </>
      ) : (
        <div className="detail-grid">
          {savedSearches.map((savedSearch) => (
            <span key={savedSearch._id} className="cost-row">
              {describeSavedSearch(savedSearch)}
              <button
                className="text-button"
                type="button"
                disabled={deletingId === savedSearch._id}
                onClick={() => handleDelete(savedSearch._id)}
              >
                {deletingId === savedSearch._id ? "Removing..." : "Remove"}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePanel() {
  const { currentUser, setCurrentUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const startEditing = () => {
    setName(currentUser?.name || "");
    setPhone(currentUser?.phone || "");
    setError("");
    setSavedMessage("");
    setEditing(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const updated = await updateCurrentUser({ name: name.trim(), phone: phone.trim() });
      setCurrentUser?.(updated);
      setEditing(false);
      setSavedMessage("Profile updated.");
    } catch (err) {
      setError(err.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel stack">
      <div className="view-header">
        <h3>Profile</h3>
        {!editing && (
          <button className="secondary-button" type="button" onClick={startEditing}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form className="stack" onSubmit={handleSave}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              required
            />
          </label>
          <label>
            Phone
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button className="secondary-button" type="button" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {savedMessage && <p className="success-text">{savedMessage}</p>}
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
        </>
      )}
    </div>
  );
}

function ChangePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);

    try {
      await changeCurrentUserPassword({ currentPassword, newPassword });
      setSuccessMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Could not change your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel stack">
      <h3>Change password</h3>
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        {successMessage && <p className="success-text">{successMessage}</p>}
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PushNotificationsPanel() {
  const { supported, subscribed, subscribe, unsubscribe, loading, error } = usePushSubscription();

  if (!supported) {
    return null;
  }

  return (
    <div className="panel stack">
      <h3>Browser notifications</h3>
      <p className="muted-copy">
        Get a notification in this browser when something happens - a new inquiry response, a mover request
        update, and more.
      </p>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={loading}
          onClick={subscribed ? unsubscribe : subscribe}
        >
          {loading ? "Working..." : subscribed ? "Disable browser notifications" : "Enable browser notifications"}
        </button>
      </div>
    </div>
  );
}

export default function AccountPage({ onAccountDeleted, onBrowse }) {
  const { currentUser } = useAuth();
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
          <p>Manage your JakezApp profile and data controls.</p>
        </div>
      </div>

      <ProfilePanel />

      <ChangePasswordPanel />

      <PushNotificationsPanel />

      {currentUser?.role === "tenant" && <SavedSearchesPanel onBrowse={onBrowse} />}

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
