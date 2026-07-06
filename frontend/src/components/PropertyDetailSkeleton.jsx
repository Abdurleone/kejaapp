export default function PropertyDetailSkeleton() {
  return (
    <div className="panel detail-panel" role="status" aria-label="Loading property" aria-hidden="true">
      <div className="property-photo skeleton" />

      <div className="skeleton skeleton-line skeleton-line--sm" />

      <div className="property-meta">
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>

      <div className="skeleton skeleton-line skeleton-line--full" />
      <div className="skeleton skeleton-line skeleton-line--lg" />

      <div className="skeleton-line--title skeleton skeleton-line" />
      <div className="detail-grid">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="skeleton" key={index} />
        ))}
      </div>
    </div>
  );
}
