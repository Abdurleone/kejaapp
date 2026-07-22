import { memo } from "react";

function NotificationRow({ notification, isMarking, onMarkRead }) {
  return (
    <article className="property-card">
      <div className="property-body">
        <div className="cost-row">
          <strong>{notification.title}</strong>
          {!notification.isRead && <span className="status-pill status-active">New</span>}
        </div>
        <p>{notification.message}</p>
        <div className="cost-row">
          <span className="muted-copy">{new Date(notification.createdAt).toLocaleString()}</span>
          {!notification.isRead && (
            <button
              className="text-button"
              type="button"
              disabled={isMarking}
              onClick={() => onMarkRead(notification._id)}
            >
              {isMarking ? "Marking..." : "Mark as read"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(NotificationRow);
