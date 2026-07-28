import { memo } from "react";
import { formatKes, formatRatingSummary } from "../../app-utils.js";

function SavedPropertyCard({ property, isRemoving, onOpenProperty, onRemove }) {
  const propertyId = property._id || property.id;

  return (
    <article className="property-card" onClick={() => onOpenProperty(propertyId)}>
      <div className="property-body">
        <h3 className="property-title">{property.title || "Rental property"}</h3>
        <p className="property-rating">{formatRatingSummary(property.ratingAverage, property.ratingCount)}</p>
        <div className="cost-row">
          <strong>{formatKes(property.price?.rent)}</strong>
          <span>{property.location?.area || "Nairobi"}</span>
        </div>
        <div className="card-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenProperty(propertyId);
            }}
          >
            Details
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={isRemoving}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(propertyId);
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(SavedPropertyCard);
