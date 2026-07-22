import { memo } from "react";
import { formatKes, formatRatingSummary, getPropertyImage } from "../../app-utils.js";

function PropertyCard({ property, isSaved, isSaving, signedIn, onSave, onOpenProperty }) {
  const propertyId = property._id || property.id;
  const rent = property.price?.rent ?? property.rent;
  const area = property.location?.area || property.area || "Nairobi";
  const county = property.location?.county || property.county || "Kenya";
  const bedrooms = property.bedrooms ?? property.details?.bedrooms;
  const bathrooms = property.bathrooms ?? property.details?.bathrooms;

  return (
    <article className="property-card">
      <div className="property-photo">
        <img src={getPropertyImage(property)} alt={property.title || "Rental property"} loading="lazy" />
        <span className="status-pill">{property.status || "available"}</span>
      </div>
      <div className="property-body">
        <div>
          <h3 className="property-title">{property.title || "Rental property"}</h3>
          <p className="muted-copy">
            {area}, {county}
          </p>
          <p className="property-rating">{formatRatingSummary(property.ratingAverage, property.ratingCount)}</p>
          {property.owner?.role === "agency" && property.owner.verified && (
            <span className="status-pill status-active verified-badge">Verified agency</span>
          )}
        </div>
        <div className="cost-row">
          <strong>{formatKes(rent)}</strong>
          <span>per month</span>
        </div>
        <div className="property-meta">
          <span>{bedrooms || "-"} beds</span>
          <span>{bathrooms || "-"} baths</span>
          <span>{property.viewingType || "viewing"}</span>
        </div>
        {property.description && <p className="muted-copy property-summary">{property.description}</p>}
        <div className="card-actions">
          <button
            className="primary-button"
            type="button"
            disabled={isSaved || isSaving}
            onClick={() => onSave(propertyId)}
          >
            {isSaving ? "Saving..." : isSaved ? "Saved" : signedIn ? "Save" : "Sign in to save"}
          </button>
          <button className="secondary-button" type="button" onClick={() => onOpenProperty(propertyId)}>
            Details
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(PropertyCard);
