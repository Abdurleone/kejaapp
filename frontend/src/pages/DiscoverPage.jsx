import { useEffect, useMemo, useState } from "react";
import { PropertyCardSkeletonGrid } from "../components/PropertyCardSkeleton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createSavedSearch,
  fetchFavorites,
  fetchProperties,
  formatKes,
  formatRatingSummary,
  getPropertyImage,
  saveFavorite,
  summarizeProperties,
} from "../../app-utils.js";

const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const bedroomOptions = [1, 2, 3, 4, 5];

export default function DiscoverPage({ onOpenProperty }) {
  const { signedIn, openAuthPanel: onRequireAuth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPropertyId, setSavingPropertyId] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState([]);
  const [saveError, setSaveError] = useState("");
  const [coords, setCoords] = useState(null);
  const [radius, setRadius] = useState(5);
  const [type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchMessage, setSaveSearchMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  // The filter set actually fetched, as opposed to the raw min/max rent
  // inputs below - those only feed a fetch once "Apply price" is clicked,
  // everything else applies immediately on change.
  const [appliedFilters, setAppliedFilters] = useState({
    lat: null,
    lng: null,
    radiusKm: radius,
    type: "",
    bedrooms: "",
    minRent: "",
    maxRent: "",
  });

  useEffect(() => {
    let active = true;

    const loadUserMetadata = async () => {
      if (!signedIn) {
        if (active) setSavedPropertyIds([]);
        return;
      }

      try {
        const favorites = await fetchFavorites();
        if (active) {
          setSavedPropertyIds(
            favorites
              .map((favorite) => favorite.property?._id || favorite.property?.id || favorite._id || favorite.id)
              .filter(Boolean),
          );
        }
      } catch (err) {
        console.error("Could not sync favorites", err);
      }
    };

    loadUserMetadata();

    return () => {
      active = false;
    };
  }, [signedIn]);

  // Deriving the fetch from appliedFilters (rather than calling a shared
  // loadProperties function ad hoc from every handler) is what makes the
  // active-flag guard actually work: React runs this effect's cleanup
  // before the next one fires whenever appliedFilters/retryKey changes, so
  // a still-in-flight, now-stale request can never overwrite a newer one.
  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const params = { page: 1, limit: 12 };

        if (appliedFilters.lat != null && appliedFilters.lng != null) {
          params.lat = appliedFilters.lat;
          params.lng = appliedFilters.lng;
          params.radiusKm = appliedFilters.radiusKm;
        }

        if (appliedFilters.type) params.type = appliedFilters.type;
        if (appliedFilters.bedrooms) params.bedrooms = appliedFilters.bedrooms;
        if (appliedFilters.minRent) params.minRent = appliedFilters.minRent;
        if (appliedFilters.maxRent) params.maxRent = appliedFilters.maxRent;

        const data = await fetchProperties(params);
        if (active) setProperties(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load properties.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [appliedFilters, retryKey]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setSaveError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setAppliedFilters((current) => ({ ...current, lat: latitude, lng: longitude, radiusKm: radius }));
      },
      () => setSaveError("Unable to retrieve your location."),
    );
  };

  const handleRadiusChange = (event) => {
    const nextRadius = Number(event.target.value);
    setRadius(nextRadius);

    if (coords) {
      setAppliedFilters((current) => ({ ...current, lat: coords.lat, lng: coords.lng, radiusKm: nextRadius }));
    }
  };

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    setType(nextType);
    setAppliedFilters((current) => ({ ...current, type: nextType }));
  };

  const handleBedroomsChange = (event) => {
    const nextBedrooms = event.target.value;
    setBedrooms(nextBedrooms);
    setAppliedFilters((current) => ({ ...current, bedrooms: nextBedrooms }));
  };

  const handleApplyPriceFilter = () => {
    setAppliedFilters((current) => ({ ...current, minRent, maxRent }));
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

  const handleSaveSearch = async () => {
    if (!signedIn) {
      onRequireAuth();
      return;
    }

    setSaveSearchMessage("");
    setSavingSearch(true);

    try {
      const payload = { lat: coords.lat, lng: coords.lng, radiusKm: radius };
      if (type) payload.type = type;
      if (bedrooms) payload.bedrooms = Number(bedrooms);
      if (minRent) payload.minRent = Number(minRent);
      if (maxRent) payload.maxRent = Number(maxRent);

      await createSavedSearch(payload);
      setSaveSearchMessage("Saved! We'll notify you when a matching listing appears.");
    } catch (err) {
      setSaveSearchMessage(err.message || "Could not save this search.");
    } finally {
      setSavingSearch(false);
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
            <>
              <button className="secondary-button" type="button" disabled={savingSearch} onClick={handleSaveSearch}>
                {savingSearch ? "Saving..." : "Save this search"}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setCoords(null);
                  setAppliedFilters((current) => ({ ...current, lat: null, lng: null }));
                }}
              >
                Clear location
              </button>
            </>
          )}
          <label className="radius-control">
            Type
            <select value={type} onChange={handleTypeChange}>
              <option value="">Any</option>
              {listingTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="radius-control">
            Bedrooms
            <select value={bedrooms} onChange={handleBedroomsChange}>
              <option value="">Any</option>
              {bedroomOptions.map((option) => (
                <option key={option} value={option}>
                  {option}+
                </option>
              ))}
            </select>
          </label>
          <input
            type="number"
            min="0"
            placeholder="Min rent"
            value={minRent}
            onChange={(event) => setMinRent(event.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Max rent"
            value={maxRent}
            onChange={(event) => setMaxRent(event.target.value)}
          />
          <button className="secondary-button" type="button" onClick={handleApplyPriceFilter}>
            Apply price
          </button>
        </div>
      </div>
      {saveSearchMessage && (
        <div className="panel notice-panel">
          <p className="muted-copy">{saveSearchMessage}</p>
        </div>
      )}

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
          <p className="error-text">{saveError}</p>
        </div>
      )}

      {loading ? (
        <PropertyCardSkeletonGrid />
      ) : error ? (
        <div className="panel">
          <p className="error-text">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
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
