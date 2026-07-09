import { useEffect, useState } from "react";
import { fetchNotifications, markNotificationAsRead } from "../../app-utils.js";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchNotifications(unreadOnly ? { unread: "true" } : {});
        if (active) setNotifications(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load notifications.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [retryKey, unreadOnly]);

  const handleMarkRead = async (notificationId) => {
    setMarkingId(notificationId);

    try {
      const updated = await markNotificationAsRead(notificationId);
      setNotifications((current) =>
        unreadOnly
          ? current.filter((item) => item._id !== notificationId)
          : current.map((item) => (item._id === notificationId ? updated : item)),
      );
    } catch (err) {
      setError(err.message || "Could not mark this notification as read.");
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Notifications</h2>
          <p>Updates on your inquiries, viewings, reviews, and account.</p>
        </div>
        <div className="header-actions">
          <label className="radius-control">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            Unread only
          </label>
        </div>
      </div>

      <div className="panel stack">
        {loading ? (
          <div className="stack" role="status" aria-label="Loading notifications" aria-hidden="true">
            <span className="skeleton skeleton-line skeleton-line--full" />
            <span className="skeleton skeleton-line skeleton-line--full" />
            <span className="skeleton skeleton-line skeleton-line--full" />
          </div>
        ) : error ? (
          <div className="stack">
            <p className="error-text">{error}</p>
            <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <p className="muted-copy">
            {unreadOnly ? "No unread notifications." : "You don't have any notifications yet."}
          </p>
        ) : (
          <div className="property-grid compact-grid">
            {notifications.map((item) => (
              <article className="property-card" key={item._id}>
                <div className="property-body">
                  <div className="cost-row">
                    <strong>{item.title}</strong>
                    {!item.isRead && <span className="status-pill status-active">New</span>}
                  </div>
                  <p>{item.message}</p>
                  <div className="cost-row">
                    <span className="muted-copy">{new Date(item.createdAt).toLocaleString()}</span>
                    {!item.isRead && (
                      <button
                        className="text-button"
                        type="button"
                        disabled={markingId === item._id}
                        onClick={() => handleMarkRead(item._id)}
                      >
                        {markingId === item._id ? "Marking..." : "Mark as read"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
