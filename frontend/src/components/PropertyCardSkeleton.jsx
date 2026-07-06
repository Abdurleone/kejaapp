export default function PropertyCardSkeleton() {
  return (
    <article className="property-card" aria-hidden="true">
      <div className="property-photo skeleton" />
      <div className="property-body skeleton-card-body">
        <div className="skeleton skeleton-line skeleton-line--title" />
        <div className="skeleton skeleton-line skeleton-line--sm" />
        <div className="skeleton skeleton-chip skeleton-line--md" />
      </div>
    </article>
  );
}

export function PropertyCardSkeletonGrid({ count = 6, compact = false }) {
  return (
    <div className={`property-grid${compact ? " compact-grid" : ""}`} role="status" aria-label="Loading listings">
      {Array.from({ length: count }, (_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );
}
