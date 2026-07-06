export default function DashboardSkeleton() {
  return (
    <div className="stack" role="status" aria-label="Loading dashboard" aria-hidden="true">
      <div className="stat-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="skeleton-card-body" key={index}>
            <span className="skeleton skeleton-line skeleton-line--sm" />
            <span className="skeleton skeleton-line skeleton-line--md" />
          </div>
        ))}
      </div>

      <div className="panel stack">
        <span className="skeleton skeleton-line skeleton-line--title" />
        <div className="stat-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="skeleton-card-body" key={index}>
              <span className="skeleton skeleton-line skeleton-line--sm" />
              <span className="skeleton skeleton-line skeleton-line--md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
