import { useCallback, useEffect, useState } from "react";
import NotificationRow from "../components/NotificationRow.jsx";
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../../app-utils.js";

// Only wired up for the actionable recipient of a request - the mover
// opening a mover_request notification, or the property owner opening a
// viewing/inquiry notification. The other side (e.g. a tenant being told
// their viewing was approved) has no "my sent requests" tracking view to
// land on yet, so those notifications stay read-only for now.
export const resolveNotificationTarget = (notification, role) => {
  if (notification.type === "mover_request" && role === "mover") {
    return { view: "movers", highlightId: notification.data?.moverRequest };
  }

  if (notification.type === "viewing" && (role === "landlord" || role === "agency")) {
    return { view: "owner", highlightId: notification.data?.viewingRequest };
  }

  if (notification.type === "inquiry" && (role === "landlord" || role === "agency")) {
    return { view: "owner", highlightId: notification.data?.inquiry };
  }

  return null;
};

export default function NotificationsPage({ currentUser, onNavigateToRequest }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

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

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    setActionError("");

    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => (unreadOnly ? [] : current.map((item) => ({ ...item, isRead: true }))));
    } catch (err) {
      setActionError(err.message || "Could not mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }, [unreadOnly]);

  const handleMarkRead = useCallback(
    async (notificationId) => {
      setMarkingId(notificationId);
      setActionError("");

      try {
        const updated = await markNotificationAsRead(notificationId);
        setNotifications((current) =>
          unreadOnly
            ? current.filter((item) => item._id !== notificationId)
            : current.map((item) => (item._id === notificationId ? updated : item)),
        );
      } catch (err) {
        setActionError(err.message || "Could not mark this notification as read.");
      } finally {
        setMarkingId(null);
      }
    },
    [unreadOnly]
  );

  const handleOpenNotification = useCallback(
    (notification, target) => {
      if (!notification.isRead) {
        handleMarkRead(notification._id);
      }
      onNavigateToRequest?.(target);
    },
    [handleMarkRead, onNavigateToRequest]
  );

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
          {notifications.some((item) => !item.isRead) && (
            <button className="secondary-button" type="button" disabled={markingAll} onClick={handleMarkAllRead}>
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="panel notice-panel">
          <p className="error-text">{actionError}</p>
        </div>
      )}

      <div className="panel stack">
        {loading ? (
          <div className="stack" role="status" aria-label="Loading notifications">
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
        ) : notifications.length === 0 ? (
          <p className="muted-copy">
            {unreadOnly ? "No unread notifications." : "You don't have any notifications yet."}
          </p>
        ) : (
          <div className="property-grid compact-grid">
            {notifications.map((item) => {
              const target = resolveNotificationTarget(item, currentUser?.role);
              return (
                <NotificationRow
                  key={item._id}
                  notification={item}
                  isMarking={markingId === item._id}
                  onMarkRead={handleMarkRead}
                  onOpen={target ? () => handleOpenNotification(item, target) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
