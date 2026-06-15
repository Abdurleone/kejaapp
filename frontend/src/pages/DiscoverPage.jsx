import { useEffect, useMemo, useState } from "react";
import { 
  fetchProperties, 
  formatKes, 
  summarizeProperties, 
  saveFavorite, 
  fetchFavorites // Ensure this is imported
} from "../../app-utils.js";

export default function DiscoverPage({ signedIn, onRequireAuth, currentUser }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPropertyId, setSavingPropertyId] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState([]);
  const [saveError, setSaveError] = useState("");
  
  // --- NEW: Location Search State ---
  const [coords, setCoords] = useState(null); 
  const [radius, setRadius] = useState(5);

  // 1. Load Properties (with support for Geo-filtering)
  const loadProperties = async (lat = null, lng = null) => {
    try {
      setLoading(true);
      const params = { page: 1, limit: 12 };
      
      if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
        params.radiusKm = radius;
      }

      const data = await fetchProperties(params);
      setProperties(data);
    } catch (err) {
      setError(err.message || "Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Load User's saved property IDs to sync the "Save" buttons
  useEffect(() => {
    const loadUserMetadata = async () => {
      if (signedIn) {
        try {
          const favorites = await fetchFavorites();
          setSavedPropertyIds(favorites.map(f => f.property._id || f.property.id));
        } catch (err) {
          console.error("Could not sync favorites", err);
        }
      } else {
        setSavedPropertyIds([]);
      }
    };

    loadUserMetadata();
    loadProperties();
  }, [signedIn]);

  // 3. Handle "Near Me" Location Search
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setSaveError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        loadProperties(latitude, longitude);
      },
      () => setSaveError("Unable to retrieve your location")
    );
  };

  const summary = useMemo(() => summarizeProperties(properties), [properties]);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Discover rentals</h2>
          <p>Browse available homes in Kenya and save the ones you love.</p>
        </div>
        {/* --- NEW: Location Search UI --- */}
        <div className="header-actions">
           <button className="secondary-button" onClick={handleNearMe}>
             📍 Near me
           </button>
           {coords && (
             <button className="text-button" onClick={() => { setCoords(null); loadProperties(); }}>
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

      {/* ... Rest of your rendering logic ... */}
      {/* (Keep your property-grid as is, it now uses the synced savedPropertyIds) */}
    </div>
  );
}
