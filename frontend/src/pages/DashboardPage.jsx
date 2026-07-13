import { useEffect, useState } from "react";
import DashboardSkeleton from "../components/DashboardSkeleton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchDashboardSummary, formatStatusLabel } from "../../app-utils.js";

const roleLabels = {
  tenant: "Tenant",
  landlord: "Landlord",
  agency: "Agency",
  mover: "Mover",
  admin: "Admin",
};

const StatTile = ({ value, label }) => (
  <div>
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
);

const StatusStatTiles = ({ counts, suffix }) =>
  Object.entries(counts).map(([status, count]) => (
    <StatTile key={`${suffix}-${status}`} value={count} label={`${formatStatusLabel(status)} ${suffix}`} />
  ));

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchDashboardSummary();
        if (active) setSummary(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load your dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [retryKey]);

  const roleLabel = roleLabels[currentUser?.role] || "Account";

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Dashboard</h2>
          <p>
            {roleLabel} overview for {currentUser?.name || currentUser?.email || "your account"}.
          </p>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="panel">
          <p className="error-text">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      ) : (
        <div className="stack">
          <div className="stat-grid">
            <StatTile value={summary.notifications.unread} label="Unread notifications" />
          </div>

          {summary.tenant && (
            <div className="panel stack">
              <h3>Your activity</h3>
              <div className="stat-grid">
                <StatTile value={summary.tenant.savedProperties} label="Saved properties" />
                <StatusStatTiles counts={summary.tenant.inquiries} suffix="inquiries" />
                <StatusStatTiles counts={summary.tenant.viewings} suffix="viewings" />
              </div>
            </div>
          )}

          {summary.owner && (
            <div className="panel stack">
              <h3>Your listings</h3>
              <div className="stat-grid">
                <StatusStatTiles counts={summary.owner.properties} suffix="properties" />
                <StatusStatTiles counts={summary.owner.incomingInquiries} suffix="incoming inquiries" />
                <StatusStatTiles counts={summary.owner.incomingViewings} suffix="incoming viewings" />
              </div>
            </div>
          )}

          {summary.agency && (
            <div className="panel stack">
              <h3>Agency verification</h3>
              <p className="muted-copy">
                Status: <strong>{formatStatusLabel(summary.agency.verificationStatus)}</strong>
              </p>
              {summary.agency.rejectionReason && <p className="muted-copy">{summary.agency.rejectionReason}</p>}
            </div>
          )}

          {summary.mover && (
            <div className="panel stack">
              <h3>Mover verification</h3>
              <p className="muted-copy">
                Status: <strong>{formatStatusLabel(summary.mover.verificationStatus)}</strong>
              </p>
              {summary.mover.rejectionReason && <p className="muted-copy">{summary.mover.rejectionReason}</p>}
              <div className="stat-grid">
                <StatusStatTiles counts={summary.mover.receivedRequests} suffix="requests" />
              </div>
            </div>
          )}

          {summary.admin && (
            <div className="panel stack">
              <h3>Platform moderation</h3>
              <div className="stat-grid">
                <StatusStatTiles counts={summary.admin.agencyVerifications} suffix="agency verifications" />
                <StatusStatTiles counts={summary.admin.moverVerifications} suffix="mover verifications" />
                <StatusStatTiles counts={summary.admin.violations} suffix="violations" />
                <StatusStatTiles counts={summary.admin.feedback} suffix="feedback" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
