import { useEffect, useState } from "react";
import PropertyDetailSkeleton from "../components/PropertyDetailSkeleton.jsx";
import {
  createInquiry,
  createViewingRequest,
  fetchFavorites,
  fetchPropertyById,
  formatKes,
  formatRatingSummary,
  getPropertyImage,
  saveFavorite,
} from "../../app-utils.js";

const contactMethodLabels = {
  phone: "Phone",
  email: "Email",
  whatsapp: "WhatsApp",
  inquiry: "In-app inquiry",
};

const contactPreferences = [
  { value: "in_app", label: "In-app" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

const minScheduledDateTime = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
};

export default function PropertyDetailPage({ propertyId, signedIn, onRequireAuth, apiBaseUrl, onBack }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeForm, setActiveForm] = useState(null);

  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryContactPreference, setInquiryContactPreference] = useState("in_app");
  const [inquiryError, setInquiryError] = useState("");
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  const [viewingDate, setViewingDate] = useState(minScheduledDateTime());
  const [viewingMessage, setViewingMessage] = useState("");
  const [viewingError, setViewingError] = useState("");
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingSent, setViewingSent] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchPropertyById(propertyId);
        if (active) setProperty(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load this property.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!signedIn) return;

    fetchFavorites()
      .then((favorites) => {
        const saved = favorites.some(
          (favorite) => String(favorite.property?._id || favorite.property?.id || favorite._id) === String(propertyId)
        );
        setIsSaved(saved);
      })
      .catch(() => {});
  }, [signedIn, propertyId]);

  const handleSave = async () => {
    if (!signedIn) {
      onRequireAuth();
      return;
    }

    setSaving(true);

    try {
      await saveFavorite(propertyId);
      setIsSaved(true);
    } catch {
      // Leave unsaved; user can retry.
    } finally {
      setSaving(false);
    }
  };

  const openForm = (form) => {
    if (!signedIn) {
      onRequireAuth();
      return;
    }

    setActiveForm(form);
  };

  const handleInquirySubmit = async (event) => {
    event.preventDefault();
    setInquiryError("");

    if (!inquiryMessage.trim()) {
      setInquiryError("Message is required.");
      return;
    }

    setInquirySubmitting(true);

    try {
      await createInquiry({
        property: propertyId,
        subject: inquirySubject.trim(),
        message: inquiryMessage.trim(),
        contactPreference: inquiryContactPreference,
      });
      setInquirySent(true);
    } catch (err) {
      setInquiryError(err.message || "Could not send your inquiry.");
    } finally {
      setInquirySubmitting(false);
    }
  };

  const handleViewingSubmit = async (event) => {
    event.preventDefault();
    setViewingError("");

    const isScheduled = property?.viewingType === "scheduled";
    let requestedDateIso;

    if (isScheduled) {
      const date = new Date(viewingDate);

      if (!viewingDate || Number.isNaN(date.getTime())) {
        setViewingError("Choose a valid future date.");
        return;
      }

      requestedDateIso = date.toISOString();
    }

    setViewingSubmitting(true);

    try {
      await createViewingRequest({
        property: propertyId,
        requestedDate: requestedDateIso,
        message: viewingMessage.trim(),
      });
      setViewingSent(true);
    } catch (err) {
      setViewingError(err.message || "Could not send your viewing request.");
    } finally {
      setViewingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="view active-view">
        <PropertyDetailSkeleton />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="view active-view">
        <div className="panel">
          <p className="muted-copy">{error || "Property not found."}</p>
          <button className="secondary-button" type="button" onClick={onBack}>
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  const cost = property.costSummary || {};
  const contact = property.contact || {};
  const hasContactInfo = contact.phone || contact.email || contact.whatsapp || contact.availableHours;
  const isScheduled = property.viewingType === "scheduled";

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <button className="text-button" type="button" onClick={onBack}>
            ← Back to Discover
          </button>
          <h2>{property.title || "Rental property"}</h2>
          <p>
            {property.location?.area || "Nairobi"}, {property.location?.county || "Kenya"}
          </p>
        </div>
      </div>

      <div className="panel detail-panel">
        <div className="property-photo">
          <img src={getPropertyImage(property, apiBaseUrl)} alt={property.title || "Rental property"} />
          <span className="status-pill">{property.status || "available"}</span>
        </div>

        <p className="muted-copy">{formatRatingSummary(property.ratingAverage, property.ratingCount)}</p>

        <div className="property-meta">
          <span>{property.bedrooms ?? "-"} beds</span>
          <span>{property.bathrooms ?? "-"} baths</span>
          <span>{property.viewingType || "viewing"}</span>
        </div>

        {property.description && <p>{property.description}</p>}

        <h3>Cost summary</h3>
        <div className="detail-grid">
          <span>
            <strong>Monthly rent</strong>
            {formatKes(cost.rent)}
          </span>
          <span>
            <strong>Deposit</strong>
            {formatKes(cost.deposit)}
          </span>
          <span>
            <strong>Agency fee</strong>
            {formatKes(cost.agencyFee)}
          </span>
          <span>
            <strong>First month total</strong>
            {formatKes(cost.firstMonthTotal)}
          </span>
          <span>
            <strong>Upfront total</strong>
            {formatKes(cost.upfrontTotal)}
          </span>
        </div>

        {hasContactInfo && (
          <>
            <h3>Contact</h3>
            <div className="detail-grid">
              <span>
                <strong>Preferred method</strong>
                {contactMethodLabels[contact.preferredMethod] || "In-app inquiry"}
              </span>
              {contact.phone && (
                <span>
                  <strong>Phone</strong>
                  {contact.phone}
                </span>
              )}
              {contact.email && (
                <span>
                  <strong>Email</strong>
                  {contact.email}
                </span>
              )}
              {contact.whatsapp && (
                <span>
                  <strong>WhatsApp</strong>
                  {contact.whatsapp}
                </span>
              )}
              {contact.availableHours && (
                <span>
                  <strong>Available</strong>
                  {contact.availableHours}
                </span>
              )}
            </div>
          </>
        )}

        {property.amenities?.length > 0 && (
          <>
            <h3>Amenities</h3>
            <div className="property-meta">
              {property.amenities.map((amenity) => (
                <span key={amenity}>{amenity}</span>
              ))}
            </div>
          </>
        )}

        <div className="card-actions">
          <button
            className="primary-button"
            type="button"
            disabled={isSaved || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : isSaved ? "Saved" : signedIn ? "Save" : "Sign in to save"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setInquirySent(false);
              openForm(activeForm === "inquiry" ? null : "inquiry");
            }}
          >
            Send inquiry
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setViewingSent(false);
              openForm(activeForm === "viewing" ? null : "viewing");
            }}
          >
            Request viewing
          </button>
        </div>
      </div>

      {activeForm === "inquiry" && (
        <div className="panel detail-panel">
          {inquirySent ? (
            <>
              <h3>Inquiry sent</h3>
              <p className="muted-copy">The owner will respond in-app or via your preferred contact method.</p>
            </>
          ) : (
            <form className="auth-panel-form" onSubmit={handleInquirySubmit}>
              <h3>Send inquiry</h3>
              <label>
                Subject (optional)
                <input
                  type="text"
                  value={inquirySubject}
                  onChange={(event) => setInquirySubject(event.target.value)}
                  maxLength={140}
                />
              </label>
              <label>
                Message
                <textarea
                  value={inquiryMessage}
                  onChange={(event) => setInquiryMessage(event.target.value)}
                  rows={5}
                  maxLength={1000}
                />
              </label>
              <label>
                Preferred contact
                <select
                  value={inquiryContactPreference}
                  onChange={(event) => setInquiryContactPreference(event.target.value)}
                >
                  {contactPreferences.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {inquiryError && <p className="muted-copy">{inquiryError}</p>}
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={inquirySubmitting}>
                  {inquirySubmitting ? "Sending..." : "Send inquiry"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setActiveForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeForm === "viewing" && (
        <div className="panel detail-panel">
          {viewingSent ? (
            <>
              <h3>Viewing requested</h3>
              <p className="muted-copy">
                {isScheduled
                  ? "The owner will confirm your requested time."
                  : "This is an open viewing, so your request is approved automatically."}
              </p>
            </>
          ) : (
            <form className="auth-panel-form" onSubmit={handleViewingSubmit}>
              <h3>Request viewing</h3>
              {isScheduled ? (
                <label>
                  Requested date and time
                  <input
                    type="datetime-local"
                    value={viewingDate}
                    min={minScheduledDateTime()}
                    onChange={(event) => setViewingDate(event.target.value)}
                    required
                  />
                </label>
              ) : (
                <p className="muted-copy">
                  This property has open viewing — no need to pick a time. Your request is approved automatically.
                </p>
              )}
              <label>
                Message (optional)
                <textarea
                  value={viewingMessage}
                  onChange={(event) => setViewingMessage(event.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </label>
              {viewingError && <p className="muted-copy">{viewingError}</p>}
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={viewingSubmitting}>
                  {viewingSubmitting ? "Sending..." : "Request viewing"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setActiveForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
