import { useEffect, useState } from "react";
import { PropertyCardSkeletonGrid } from "../components/PropertyCardSkeleton.jsx";
import {
  fetchMyProperties,
  fetchReceivedInquiries,
  formatKes,
  formatStatusLabel,
  respondToInquiry,
} from "../../app-utils.js";

export default function WorkspacePage({ onEditProperty, onCreateProperty }) {
  const [properties, setProperties] = useState([]);
  const [propertiesPagination, setPropertiesPagination] = useState(null);
  const [propertiesPage, setPropertiesPage] = useState(1);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");
  const [propertiesRetryKey, setPropertiesRetryKey] = useState(0);

  const [inquiries, setInquiries] = useState([]);
  const [inquiriesPagination, setInquiriesPagination] = useState(null);
  const [inquiriesPage, setInquiriesPage] = useState(1);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [inquiriesError, setInquiriesError] = useState("");
  const [inquiriesRetryKey, setInquiriesRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setPropertiesLoading(true);
      setPropertiesError("");

      try {
        const { properties: data, pagination } = await fetchMyProperties({ page: propertiesPage });
        if (active) {
          setProperties(data);
          setPropertiesPagination(pagination);
        }
      } catch (err) {
        if (active) setPropertiesError(err.message || "Failed to load your listings.");
      } finally {
        if (active) setPropertiesLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [propertiesPage, propertiesRetryKey]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setInquiriesLoading(true);
      setInquiriesError("");

      try {
        const { inquiries: data, pagination } = await fetchReceivedInquiries({ page: inquiriesPage });
        if (active) {
          setInquiries(data);
          setInquiriesPagination(pagination);
        }
      } catch (err) {
        if (active) setInquiriesError(err.message || "Failed to load your inquiries.");
      } finally {
        if (active) setInquiriesLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [inquiriesPage, inquiriesRetryKey]);

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Property workspace</h2>
          <p>Your listings and the inquiries tenants have sent about them.</p>
        </div>
        <div className="header-actions">
          <button className="primary-button" type="button" onClick={onCreateProperty}>
            New listing
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Your listings {propertiesPagination ? `(${propertiesPagination.total})` : ""}</h3>
        {propertiesLoading ? (
          <PropertyCardSkeletonGrid count={3} compact />
        ) : propertiesError ? (
          <>
            <p className="error-text">{propertiesError}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPropertiesRetryKey((key) => key + 1)}
            >
              Retry
            </button>
          </>
        ) : properties.length === 0 ? (
          <p className="muted-copy">You haven&apos;t listed any properties yet.</p>
        ) : (
          <>
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
                    <div className="card-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => onEditProperty(property._id)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <PaginationFooter
              pagination={propertiesPagination}
              page={propertiesPage}
              onPageChange={setPropertiesPage}
            />
          </>
        )}
      </div>

      <div className="panel">
        <h3>Inquiries {inquiriesPagination ? `(${inquiriesPagination.total})` : ""}</h3>
        {inquiriesLoading ? (
          <PropertyCardSkeletonGrid count={3} compact />
        ) : inquiriesError ? (
          <>
            <p className="error-text">{inquiriesError}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setInquiriesRetryKey((key) => key + 1)}
            >
              Retry
            </button>
          </>
        ) : inquiries.length === 0 ? (
          <p className="muted-copy">No inquiries yet. They&apos;ll show up here once tenants reach out.</p>
        ) : (
          <>
            <div className="property-grid compact-grid">
              {inquiries.map((inquiry) => (
                <InquiryCard
                  key={inquiry._id}
                  inquiry={inquiry}
                  onResponded={(updated) =>
                    setInquiries((current) =>
                      current.map((item) => (item._id === updated._id ? updated : item))
                    )
                  }
                />
              ))}
            </div>
            <PaginationFooter
              pagination={inquiriesPagination}
              page={inquiriesPage}
              onPageChange={setInquiriesPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PaginationFooter({ pagination, page, onPageChange }) {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  return (
    <div className="form-actions">
      <button
        className="secondary-button"
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange((current) => current - 1)}
      >
        Previous
      </button>
      <span className="muted-copy">
        Page {pagination.page} of {pagination.pages}
      </span>
      <button
        className="secondary-button"
        type="button"
        disabled={page >= pagination.pages}
        onClick={() => onPageChange((current) => current + 1)}
      >
        Next
      </button>
    </div>
  );
}

function InquiryCard({ inquiry, onResponded }) {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleRespond = async (status) => {
    setError("");
    setSubmitting(true);

    try {
      // "Close without reply" must not send whatever draft text is sitting in
      // the textarea - the owner explicitly chose not to reply, so the
      // response is always empty regardless of what they'd typed and not sent.
      const updated = await respondToInquiry(inquiry._id, {
        status,
        response: status === "responded" ? response.trim() : "",
      });
      onResponded(updated);
    } catch (err) {
      setError(err.message || "Could not send your response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="property-card">
      <div className="property-body">
        <h3 className="property-title">{inquiry.property?.title || "Property"}</h3>
        <p className="muted-copy">{inquiry.subject || inquiry.message}</p>
        <div className="cost-row">
          <span>{inquiry.sender?.name || "Tenant"}</span>
          <span className="status-pill">{formatStatusLabel(inquiry.status)}</span>
        </div>

        {inquiry.status !== "open" ? (
          <p className="muted-copy">
            {inquiry.response ? `Your response: ${inquiry.response}` : "Closed without a reply."}
          </p>
        ) : (
          <>
            <textarea
              rows={2}
              placeholder="Write a response..."
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              maxLength={1000}
            />
            {error && <p className="error-text">{error}</p>}
            <div className="form-actions">
              <button
                className="primary-button"
                type="button"
                disabled={submitting || !response.trim()}
                onClick={() => handleRespond("responded")}
              >
                {submitting ? "Sending..." : "Send response"}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={submitting}
                onClick={() => handleRespond("closed")}
              >
                Close without reply
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
