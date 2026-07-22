import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchDashboardSummary } from "../../app-utils.js";

// Its own component (rather than state living in App) so the 30s poll's
// setUnreadCount only re-renders this small badge, not the entire App tree
// (including whatever page is currently mounted) on every tick.
export default function NotificationBadge({ view }) {
  const { signedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    let active = true;

    const refreshUnreadCount = async () => {
      try {
        const summary = await fetchDashboardSummary();
        if (active) setUnreadCount(summary.notifications?.unread || 0);
      } catch {
        // Non-fatal: the badge just keeps its last known value until the next refresh.
      }
    };

    refreshUnreadCount();
    // Polling rather than a push mechanism (no websockets in this app) — good enough
    // for a bell badge that only needs to notice new activity within ~30s.
    const intervalId = setInterval(refreshUnreadCount, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [signedIn]);

  // Hide the numeric badge while already on the Notifications tab — the list
  // there is showing the same unread items the badge would just be repeating.
  // Nothing gets marked read here; that only happens via explicit user action
  // (per-item or "Mark all as read"), so leaving the tab without marking
  // anything correctly brings the badge right back on the next poll.
  const displayedUnreadCount = signedIn && view !== "notifications" ? unreadCount : 0;

  if (displayedUnreadCount === 0) {
    return null;
  }

  return (
    <span className="notification-badge" aria-label={`${displayedUnreadCount} unread notifications`}>
      {displayedUnreadCount > 99 ? "99+" : displayedUnreadCount}
    </span>
  );
}
