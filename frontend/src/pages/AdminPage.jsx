import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchAdminUsers,
  fetchAdminUserSummary,
  fetchAdminUserStatusHistory,
  fetchAdminReviews,
  updateAdminUserStatus,
  formatStatusLabel,
  statusTone,
} from "../../app-utils.js";

const roleFilters = ["", "tenant", "landlord", "agency", "mover", "admin"];
const statusOptions = ["active", "suspended", "banned"];
const sections = [
  { key: "users", label: "Users" },
  { key: "reviews", label: "Reviews" },
];

function UserDetail({ userId, currentUser, onStatusUpdated }) {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("active");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const [summaryData, historyData] = await Promise.all([
          fetchAdminUserSummary(userId),
          fetchAdminUserStatusHistory(userId),
        ]);

        if (active) {
          setSummary(summaryData);
          setHistory(historyData);
          setStatus(summaryData.user.accountStatus || "active");
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load this user.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [userId, retryKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const updated = await updateAdminUserStatus(userId, { status, reason: reason || undefined });
      setSummary((current) => (current ? { ...current, user: updated } : current));
      const historyData = await fetchAdminUserStatusHistory(userId);
      setHistory(historyData);
      setReason("");
      setMessage("Account status updated.");
      onStatusUpdated?.(updated);
    } catch (err) {
      setError(err.message || "Failed to update account status.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="panel detail-panel stack" role="status" aria-label="Loading user">
        <span className="skeleton skeleton-line skeleton-line--title" aria-hidden="true" />
        <span className="skeleton skeleton-line skeleton-line--md" aria-hidden="true" />
        <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="panel detail-panel">
        <p className="error-text">{error}</p>
        <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
          Retry
        </button>
      </div>
    );
  }

  const { user, summary: counts } = summary;
  const isSelf = currentUser?._id === user._id;

  return (
    <div className="panel detail-panel">
      <h3>{user.name || "Unnamed user"}</h3>
      <div className="detail-grid">
        <span>
          <strong>Email</strong>
          {user.email}
        </span>
        <span>
          <strong>Phone</strong>
          {user.phone || "Not set"}
        </span>
        <span>
          <strong>Role</strong>
          {formatStatusLabel(user.role)}
        </span>
        <span>
          <strong>Status</strong>
          <span className={`status-pill ${statusTone(user.accountStatus || "active")}`}>
            {formatStatusLabel(user.accountStatus || "active")}
          </span>
        </span>
      </div>

      <div className="stat-grid">
        <div>
          <strong>{counts.violations.open}</strong>
          <span>Open violations</span>
        </div>
        {counts.owner && (
          <>
            <div>
              <strong>{counts.owner.properties.available}</strong>
              <span>Available listings</span>
            </div>
            <div>
              <strong>{counts.owner.incomingInquiries.open}</strong>
              <span>Open inquiries</span>
            </div>
          </>
        )}
        {counts.tenant && (
          <>
            <div>
              <strong>{counts.tenant.savedProperties}</strong>
              <span>Saved properties</span>
            </div>
            <div>
              <strong>{counts.tenant.inquiries.open}</strong>
              <span>Open inquiries</span>
            </div>
          </>
        )}
        {counts.agency && (
          <div>
            <strong>{formatStatusLabel(counts.agency.verificationStatus)}</strong>
            <span>Agency verification</span>
          </div>
        )}
      </div>

      {isSelf ? (
        <p className="muted-copy">You cannot change your own account status.</p>
      ) : (
        <form className="auth-panel-form" onSubmit={handleSubmit}>
          <label>
            Account status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatStatusLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason (required for suspend or ban)
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this account's status changing?"
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Update status"}
            </button>
          </div>
        </form>
      )}

      <div>
        <h3>Status history</h3>
        {history.length === 0 ? (
          <p className="muted-copy">No status changes recorded yet.</p>
        ) : (
          <ul className="stack">
            {history.map((entry) => (
              <li key={entry._id}>
                <span className={`status-pill ${statusTone(entry.newStatus)}`}>
                  {formatStatusLabel(entry.newStatus)}
                </span>{" "}
                by {entry.changedBy?.name || "Unknown"}
                {entry.reason ? ` — ${entry.reason}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Read-only by design - review moderation (deleting or altering a review) is
// not offered to owners or admins anywhere in this app; see
// docs/terms-of-service.md.
function AdminReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchAdminReviews();
        if (active) setReviews(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load reviews.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [retryKey]);

  if (loading) {
    return (
      <div className="stack" role="status" aria-label="Loading reviews">
        <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
        <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
        <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack">
        <p className="error-text">{error}</p>
        <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
          Retry
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return <p className="muted-copy">No reviews yet.</p>;
  }

  return (
    <div className="table-panel">
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Tenant</th>
            <th>Rating</th>
            <th>Comment</th>
            <th>Owner response</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review._id}>
              <td>{review.property?.title || "Property"}</td>
              <td>{review.user?.name || "Tenant"}</td>
              <td>{review.rating}</td>
              <td>{review.comment || "-"}</td>
              <td>{review.ownerResponse?.message || "-"}</td>
              <td>{new Date(review.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const { currentUser } = useAuth();
  const [section, setSection] = useState("users");
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Debounce the free-text search input into `search` (what actually drives
  // the fetch effect below) so typing a name doesn't fire a request per
  // keystroke - mirrors the same debounce pattern already used on mobile's
  // MoversScreen county filter.
  useEffect(() => {
    let active = true;

    const timeoutId = setTimeout(() => {
      if (!active) return;

      setSearch((current) => (current === searchInput ? current : searchInput));
      setPage(1);
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const { users: data, pagination: paginationData } = await fetchAdminUsers({
          page,
          role: role || undefined,
          search: search || undefined,
        });

        if (active) {
          setUsers(data);
          setPagination(paginationData);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load users.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [page, role, search, retryKey]);

  const handleStatusUpdated = (updatedUser) => {
    setUsers((current) =>
      current.map((user) => (user._id === updatedUser._id ? { ...user, ...updatedUser } : user))
    );
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Admin console</h2>
          <p>Manage user accounts: review activity, and suspend or ban accounts that violate platform rules.</p>
        </div>
      </div>

      <div className="auth-panel-tabs">
        {sections.map((option) => (
          <button
            key={option.key}
            type="button"
            className={section === option.key ? "active" : "secondary-button"}
            onClick={() => setSection(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {section === "reviews" ? (
        <div className="panel stack">
          <h3>Reviews</h3>
          <AdminReviewsPanel />
        </div>
      ) : (
      <>
      <div className="panel stack">
        <h3>Users {pagination ? `(${pagination.total})` : ""}</h3>
        <div className="header-actions">
          <input
            type="search"
            placeholder="Search by name, email, or phone"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <select
            value={role}
            onChange={(event) => {
              setPage(1);
              setRole(event.target.value);
            }}
          >
            {roleFilters.map((option) => (
              <option key={option || "all"} value={option}>
                {option ? formatStatusLabel(option) : "All roles"}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="stack" role="status" aria-label="Loading users">
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
          </div>
        ) : error ? (
          <div className="stack">
            <p className="error-text">{error}</p>
            <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <p className="muted-copy">No users match this search.</p>
        ) : (
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className={user._id === selectedUserId ? "selected" : ""}
                    role="button"
                    tabIndex={0}
                    aria-pressed={user._id === selectedUserId}
                    onClick={() => setSelectedUserId(user._id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedUserId(user._id);
                      }
                    }}
                  >
                    <td>{user.name || "Unnamed"}</td>
                    <td>{user.email}</td>
                    <td>{formatStatusLabel(user.role)}</td>
                    <td>
                      <span className={`status-pill ${statusTone(user.accountStatus || "active")}`}>
                        {formatStatusLabel(user.accountStatus || "active")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span className="muted-copy">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="secondary-button"
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedUserId && (
        <UserDetail userId={selectedUserId} currentUser={currentUser} onStatusUpdated={handleStatusUpdated} />
      )}
      </>
      )}
    </div>
  );
}
