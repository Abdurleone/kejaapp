import { useEffect, useMemo, useState } from "react";
import { PropertyCardSkeletonGrid } from "../components/PropertyCardSkeleton.jsx";
import {
  fetchFavorites,
  fetchProperties,
  formatKes,
  formatRatingSummary,
  getPropertyImage,
  saveFavorite,
  summarizeProperties,
} from "../../app-utils.js";

export default function DiscoverPage({ signedIn, onRequireAuth, onOpenProperty }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPropertyId, setSavingPropertyId] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState([]);
  const [saveError, setSaveError] = useState("");
  const [coords, setCoords] = useState(null);
  const [radius, setRadius] = useState(5);

  const loadProperties = async (lat = null, lng = null, radiusKm = radius) => {
    try {
      setLoading(true);
      setError("");
      const params = { page: 1, limit: 12 };

      if (lat != null && lng != null) {
        params.lat = lat;
        params.lng = lng;
        params.radiusKm = radiusKm;
      }

      const data = await fetchProperties(params);
      setProperties(data);
    } catch (err) {
      setError(err.message || "Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadUserMetadata = async () => {
      if (!signedIn) {
        setSavedPropertyIds([]);
        return;
      }

      try {
        const favorites = await fetchFavorites();
        setSavedPropertyIds(
          favorites
            .map((favorite) => favorite.property?._id || favorite.property?.id || favorite._id || favorite.id)
            .filter(Boolean),
        );
      } catch (err) {
        console.error("Could not sync favorites", err);
      }
    };

    loadUserMetadata();
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProperties();
    // loadProperties is recreated every render (not memoized) and closes over `radius`,
    // so adding it here would re-run this effect on every render instead of only when
    // sign-in state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setSaveError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        loadProperties(latitude, longitude);
      },
      () => setSaveError("Unable to retrieve your location."),
    );
  };

  const handleRadiusChange = (event) => {
    const nextRadius = Number(event.target.value);
    setRadius(nextRadius);

    if (coords) {
      loadProperties(coords.lat, coords.lng, nextRadius);
    }
  };

  const handleSave = async (propertyId) => {
    if (!signedIn) {
      onRequireAuth();
      return;
    }

    setSaveError("");
    setSavingPropertyId(propertyId);

    try {
      await saveFavorite(propertyId);
      setSavedPropertyIds((current) => [...new Set([...current, propertyId])]);
    } catch (err) {
      setSaveError(err.message || "Unable to save this listing.");
    } finally {
      setSavingPropertyId(null);
    }
  };

  const summary = useMemo(() => summarizeProperties(properties), [properties]);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Discover rentals</h2>
          <p>Browse available homes in Kenya and save the ones you love.</p>
        </div>
        <div className="header-actions">
          <label className="radius-control">
            Radius
            <select value={radius} onChange={handleRadiusChange}>
              <option value={3}>3 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={handleNearMe}>
            Near me
          </button>
          {coords && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setCoords(null);
                loadProperties();
              }}
            >
              Clear location
            </button>
          )}
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

      {saveError && (
        <div className="panel notice-panel">
          <p className="muted-copy">{saveError}</p>
        </div>
      )}

      {loading ? (
        <PropertyCardSkeletonGrid />
      ) : error ? (
        <div className="panel">
          <p className="muted-copy">{error}</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="panel empty-state">
          <h3>No rentals found</h3>
          <p className="muted-copy">Try clearing location search or widening the radius.</p>
        </div>
      ) : (
        <div className="property-grid">
          {properties.map((property) => {
            const propertyId = property._id || property.id;
            const isSaved = savedPropertyIds.includes(propertyId);
            const rent = property.price?.rent ?? property.rent;
            const area = property.location?.area || property.area || "Nairobi";
            const county = property.location?.county || property.county || "Kenya";
            const bedrooms = property.bedrooms ?? property.details?.bedrooms;
            const bathrooms = property.bathrooms ?? property.details?.bathrooms;

            return (
              <article className="property-card" key={propertyId}>
                <div className="property-photo">
                  <img src={getPropertyImage(property)} alt={property.title || "Rental property"} />
                  <span className="status-pill">{property.status || "available"}</span>
                </div>
                <div className="property-body">
                  <div>
                    <h3 className="property-title">{property.title || "Rental property"}</h3>
                    <p className="muted-copy">
                      {area}, {county}
                    </p>
                    <p className="property-rating">{formatRatingSummary(property.ratingAverage, property.ratingCount)}</p>
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
                      disabled={isSaved || savingPropertyId === propertyId}
                      onClick={() => handleSave(propertyId)}
                    >
                      {savingPropertyId === propertyId ? "Saving..." : isSaved ? "Saved" : signedIn ? "Save" : "Sign in to save"}
                    </button>
                    <button className="secondary-button" type="button" onClick={() => onOpenProperty(propertyId)}>
                      Details
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
