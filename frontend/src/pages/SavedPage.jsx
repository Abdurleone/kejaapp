import { useEffect, useState } from "react";
import { PropertyCardSkeletonGrid } from "../components/PropertyCardSkeleton.jsx";
import { fetchFavorites, removeFavorite, formatKes, formatRatingSummary } from "../../app-utils.js";

export default function SavedPage({ onOpenProperty }) {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingPropertyId, setRemovingPropertyId] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadSaved = async () => {
      try {
        setLoading(true);
        setError("");
        const favorites = await fetchFavorites();
        if (active) setSaved(favorites);
      } catch (err) {
        if (active) setError(err.message || "Failed to load saved listings.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSaved();

    return () => {
      active = false;
    };
  }, [retryKey]);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Saved listings</h2>
          <p>Review rentals you&apos;ve bookmarked for easy comparison.</p>
        </div>
      </div>

      {loading ? (
        <PropertyCardSkeletonGrid compact />
      ) : error ? (
        <div className="panel">
          <p className="error-text">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      ) : saved.length === 0 ? (
        <div className="panel">
          <p className="muted-copy">No saved listings yet. Explore properties to add your favorites.</p>
        </div>
      ) : (
        <div className="property-grid compact-grid">
          {saved.map((favorite) => {
            const property = favorite.property || favorite;
            const propertyId = property._id || property.id;

            return (
              <article className="property-card" key={propertyId}>
                <div className="property-body">
                  <h3 className="property-title">{property.title || "Rental property"}</h3>
                  <p className="property-rating">{formatRatingSummary(property.ratingAverage, property.ratingCount)}</p>
                  <div className="cost-row">
                    <strong>{formatKes(property.price?.rent)}</strong>
                    <span>{property.location?.area || "Nairobi"}</span>
                  </div>
                  <div className="card-actions">
                    <button className="secondary-button" type="button" onClick={() => onOpenProperty(propertyId)}>
                      Details
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={removingPropertyId === propertyId}
                      onClick={async () => {
                        setError("");
                        setRemovingPropertyId(propertyId);

                        try {
                          await removeFavorite(propertyId);
                          setSaved((current) => current.filter((favorite) => (favorite.property?._id || favorite._id || favorite.id) !== propertyId));
                        } catch (err) {
                          setError(err.message || "Unable to remove favorite.");
                        } finally {
                          setRemovingPropertyId(null);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
