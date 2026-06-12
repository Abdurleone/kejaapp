import { useEffect, useMemo, useState } from "react";
import { fetchProperties, formatKes, summarizeProperties, saveFavorite } from "../../app-utils.js";

export default function DiscoverPage({ signedIn, onRequireAuth }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPropertyId, setSavingPropertyId] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState([]);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        const data = await fetchProperties({ page: 1, limit: 12 });
        setProperties(data);
      } catch (err) {
        setError(err.message || "Failed to load properties.");
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  const summary = useMemo(() => summarizeProperties(properties), [properties]);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Discover rentals</h2>
          <p>Browse available homes and save the ones you love.</p>
        </div>
      </div>

      <div className="header-stats">
        <div>
          <strong>{properties.length}</strong>
          <span>Listings shown</span>
        </div>
        <div>
          <strong>{formatKes(summary.medianRent)}</strong>
          <span>Median monthly rent</span>
        </div>
        <div>
          <strong>{summary.areaCount}</strong>
          <span>Areas represented</span>
        </div>
      </div>

      {loading ? (
        <div className="panel">
          <p>Loading properties…</p>
        </div>
      ) : error ? (
        <div className="panel">
          <p className="muted-copy">{error}</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="panel">
          <p className="muted-copy">No available properties found.</p>
        </div>
      ) : (
        <>
          {saveError && (
            <div className="panel">
              <p className="muted-copy">{saveError}</p>
            </div>
          )}
          <div className="property-grid">
            {properties.map((property) => (
              <article className="property-card" key={property._id || property.id}>
                <div className="property-photo">
                  <img
                    src={property.images?.[0]?.url || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70"}
                    alt={property.title || "Rental property"}
                  />
                  <div className="photo-badges">
                    <span className="pill">{property.location?.area || "Nairobi"}</span>
                    <span className="rating-badge">{Number(property.rating || 0).toFixed(1)}/5</span>
                  </div>
                </div>
                <div className="property-body">
                  <h3 className="property-title">{property.title || "Rental property"}</h3>
                  <div className="cost-row">
                    <strong>{formatKes(property.price?.rent)}</strong>
                    <span>{property.viewingType === "open" ? "Open viewing" : "By appointment"}</span>
                  </div>
                  <div className="card-actions">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={savingPropertyId === property._id}
                      onClick={async () => {
                        if (!signedIn) {
                          onRequireAuth();
                          return;
                        }

                        setSaveError("");
                        setSavingPropertyId(property._id);

                        try {
                          await saveFavorite(property._id);
                          setSavedPropertyIds((prev) => [...prev, property._id]);
                        } catch (err) {
                          setSaveError(err.message || "Unable to save property.");
                        } finally {
                          setSavingPropertyId(null);
                        }
                      }}
                    >
                      {savedPropertyIds.includes(property._id) ? "Saved" : "Save"}
                    </button>
                    <button className="secondary-button" type="button">Details</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
