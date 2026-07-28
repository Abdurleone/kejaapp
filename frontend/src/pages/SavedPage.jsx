import { useCallback, useEffect, useState } from "react";
import PaginationFooter from "../components/PaginationFooter.jsx";
import { PropertyCardSkeletonGrid } from "../components/PropertyCardSkeleton.jsx";
import SavedPropertyCard from "../components/SavedPropertyCard.jsx";
import { fetchFavorites, removeFavorite } from "../../app-utils.js";

export default function SavedPage({ onOpenProperty, onBrowse }) {
  const [saved, setSaved] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [removingPropertyId, setRemovingPropertyId] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadSaved = async () => {
      try {
        setLoading(true);
        setError("");
        const { favorites, pagination: nextPagination } = await fetchFavorites({ page });
        if (active) {
          setSaved(favorites);
          setPagination(nextPagination);
        }
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
  }, [page, retryKey]);

  const handleRemove = useCallback(async (propertyId) => {
    setActionError("");
    setRemovingPropertyId(propertyId);

    try {
      await removeFavorite(propertyId);
      setSaved((current) =>
        current.filter((favorite) => (favorite.property?._id || favorite._id || favorite.id) !== propertyId)
      );
    } catch (err) {
      setActionError(err.message || "Unable to remove favorite.");
    } finally {
      setRemovingPropertyId(null);
    }
  }, []);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Saved listings</h2>
          <p>Review rentals you&apos;ve bookmarked for easy comparison.</p>
        </div>
      </div>

      {actionError && (
        <div className="panel notice-panel">
          <p className="error-text">{actionError}</p>
        </div>
      )}

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
          <button className="primary-button" type="button" onClick={onBrowse}>
            Browse listings
          </button>
        </div>
      ) : (
        <>
          <div className="property-grid compact-grid">
            {saved.map((favorite) => {
              const property = favorite.property || favorite;
              const propertyId = property._id || property.id;

              return (
                <SavedPropertyCard
                  key={propertyId}
                  property={property}
                  isRemoving={removingPropertyId === propertyId}
                  onOpenProperty={onOpenProperty}
                  onRemove={handleRemove}
                />
              );
            })}
          </div>
          <PaginationFooter pagination={pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
