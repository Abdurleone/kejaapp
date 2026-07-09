import { useEffect, useState } from "react";
import { deleteCurrentAccount, deleteSavedSearch, fetchSavedSearches } from "../../app-utils.js";

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

function SavedSearchesPanel() {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

    try {
      await deleteSavedSearch(savedSearchId);
      setSavedSearches((current) => current.filter((item) => item._id !== savedSearchId));
    } catch (err) {
      setError(err.message || "Could not delete this saved search.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="panel stack">
      <h3>Saved searches</h3>
      <p className="muted-copy">We&apos;ll notify you when a new listing matches one of these.</p>
      {loading ? (
        <div className="stack" role="status" aria-label="Loading saved searches" aria-hidden="true">
          <span className="skeleton skeleton-line skeleton-line--full" />
        </div>
      ) : error ? (
        <div className="stack">
          <p className="error-text">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      ) : savedSearches.length === 0 ? (
        <p className="muted-copy">
          You have no saved searches yet. Save one from the Discover page&apos;s location filters.
        </p>
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

      {currentUser?.role === "tenant" && <SavedSearchesPanel />}

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
