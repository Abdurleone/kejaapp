import { useEffect, useState } from "react";
import { fetchFavorites, removeFavorite, formatKes } from "../../app-utils.js";

export default function SavedPage() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingPropertyId, setRemovingPropertyId] = useState(null);

  useEffect(() => {
    const loadSaved = async () => {
      try {
        setLoading(true);
        const favorites = await fetchFavorites();
        setSaved(favorites);
      } catch (err) {
        setError(err.message || "Failed to load saved listings.");
      } finally {
        setLoading(false);
      }
    };

    loadSaved();
  }, []);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Saved listings</h2>
          <p>Review rentals you've bookmarked for easy comparison.</p>
        </div>
      </div>

      {loading ? (
        <div className="panel">
          <p>Loading saved listings…</p>
        </div>
      ) : error ? (
        <div className="panel">
          <p className="muted-copy">{error}</p>
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
                  <div className="cost-row">
                    <strong>{formatKes(property.price?.rent)}</strong>
                    <span>{property.location?.area || "Nairobi"}</span>
                  </div>
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
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
