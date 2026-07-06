import { useEffect, useState } from "react";
import { PropertyCardSkeletonGrid } from "../components/PropertyCardSkeleton.jsx";
import { fetchMyProperties, fetchReceivedInquiries, formatKes, formatStatusLabel } from "../../app-utils.js";

export default function WorkspacePage() {
  const [properties, setProperties] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [propertiesData, inquiriesData] = await Promise.all([
          fetchMyProperties(),
          fetchReceivedInquiries(),
        ]);

        if (active) {
          setProperties(propertiesData);
          setInquiries(inquiriesData);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load your workspace.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Property workspace</h2>
          <p>Your listings and the inquiries tenants have sent about them.</p>
        </div>
      </div>

      {loading ? (
        <>
          <div className="panel">
            <h3>Your listings</h3>
            <PropertyCardSkeletonGrid count={3} compact />
          </div>
          <div className="panel">
            <h3>Inquiries</h3>
            <PropertyCardSkeletonGrid count={3} compact />
          </div>
        </>
      ) : error ? (
        <div className="panel">
          <p className="muted-copy">{error}</p>
        </div>
      ) : (
        <>
          <div className="panel">
            <h3>Your listings ({properties.length})</h3>
            {properties.length === 0 ? (
              <p className="muted-copy">You haven&apos;t listed any properties yet.</p>
            ) : (
              <div className="property-grid compact-grid">
                {properties.map((property) => (
                  <article className="property-card" key={property._id}>
                    <div className="property-body">
                      <h3 className="property-title">{property.title || "Rental property"}</h3>
                      <div className="cost-row">
                        <strong>{formatKes(property.price?.rent)}</strong>
                        <span>{property.location?.area || "Nairobi"}</span>
                      </div>
                      <span className="status-pill">{formatStatusLabel(property.status)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Inquiries ({inquiries.length})</h3>
            {inquiries.length === 0 ? (
              <p className="muted-copy">No inquiries yet. They&apos;ll show up here once tenants reach out.</p>
            ) : (
              <div className="property-grid compact-grid">
                {inquiries.map((inquiry) => (
                  <article className="property-card" key={inquiry._id}>
                    <div className="property-body">
                      <h3 className="property-title">{inquiry.property?.title || "Property"}</h3>
                      <p className="muted-copy">{inquiry.subject || inquiry.message}</p>
                      <div className="cost-row">
                        <span>{inquiry.sender?.name || "Tenant"}</span>
                        <span className="status-pill">{formatStatusLabel(inquiry.status)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
