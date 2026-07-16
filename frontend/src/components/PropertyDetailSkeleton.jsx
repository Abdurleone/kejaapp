export default function PropertyDetailSkeleton() {
  return (
    <div className="panel detail-panel" role="status" aria-label="Loading property">
      <div className="property-photo skeleton" aria-hidden="true" />

      <div className="skeleton skeleton-line skeleton-line--sm" aria-hidden="true" />

      <div className="property-meta" aria-hidden="true">
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>

      <div className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
      <div className="skeleton skeleton-line skeleton-line--lg" aria-hidden="true" />

      <div className="skeleton-line--title skeleton skeleton-line" aria-hidden="true" />
      <div className="detail-grid" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="skeleton" key={index} />
        ))}
      </div>
    </div>
  );
}
