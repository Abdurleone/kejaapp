import { useEffect, useState } from "react";
import PropertyDetailSkeleton from "../components/PropertyDetailSkeleton.jsx";
import PropertyImage from "../components/PropertyImage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  buildEmailUrl,
  buildPhoneUrl,
  buildWhatsAppUrl,
  canManageListings,
  createInquiry,
  createMoverRequest,
  createReview,
  createViewingRequest,
  fetchFavorites,
  fetchPropertyById,
  fetchPropertyMovers,
  fetchPropertyReviews,
  formatKes,
  formatRatingSummary,
  formatStatusLabel,
  getCurrentPositionOrNull,
  getPreferredContactUrl,
  getPropertyImage,
  homeSizeOptions,
  reportReview,
  saveFavorite,
} from "../../app-utils.js";

const contactMethodLabels = {
  phone: "Phone",
  email: "Email",
  whatsapp: "WhatsApp",
  inquiry: "In-app inquiry",
};

const accessibilityFeatureLabels = {
  wheelchairRamp: "Wheelchair ramp",
  wideDoorways: "Wide doorways/entrances",
  elevatorAccess: "Elevator/lift access",
  groundFloorUnit: "Ground-floor unit",
  accessibleBathroom: "Accessible/roll-in bathroom",
  accessibleParking: "Accessible parking",
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

export default function PropertyDetailPage({ propertyId, apiBaseUrl, onBack }) {
  const { currentUser, signedIn } = useAuth();
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

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedReviewIds, setReportedReviewIds] = useState(new Set());

  const [propertyMovers, setPropertyMovers] = useState({ affiliates: [], nearby: [] });
  const [moverRequestFormId, setMoverRequestFormId] = useState(null);
  const [moverMessage, setMoverMessage] = useState("");
  const [moverPreferredDate, setMoverPreferredDate] = useState("");
  const [moverHomeSize, setMoverHomeSize] = useState("");
  const [moverError, setMoverError] = useState("");
  const [moverSubmitting, setMoverSubmitting] = useState(false);
  const [moverSentId, setMoverSentId] = useState(null);
  const [moverPriceEstimate, setMoverPriceEstimate] = useState(null);

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
    if (!signedIn) {
      return undefined;
    }

    let active = true;

    // The full 100 (the API's max page size) rather than a paginated slice -
    // this just needs to know whether this one property is already saved,
    // not one page of favorite-list display data.
    fetchFavorites({ limit: 100 })
      .then(({ favorites }) => {
        const saved = favorites.some(
          (favorite) => String(favorite.property?._id || favorite.property?.id || favorite._id) === String(propertyId)
        );
        if (active) setIsSaved(saved);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [propertyId, signedIn]);

  useEffect(() => {
    let active = true;

    fetchPropertyMovers(propertyId)
      .then((data) => {
        if (active) setPropertyMovers(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [propertyId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setReviewsLoading(true);

      try {
        const data = await fetchPropertyReviews(propertyId);
        if (active) setReviews(data.data || []);
      } catch {
        // Leave whatever reviews were already loaded; the section just
        // won't refresh this time.
      } finally {
        if (active) setReviewsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [propertyId, reviewSent]);

  const handleSave = async () => {
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
    setActiveForm(form);
  };

  const handleMoverRequestSubmit = async (event, moverId) => {
    event.preventDefault();
    setMoverError("");

    if (!moverMessage.trim()) {
      setMoverError("Message is required.");
      return;
    }

    if (!moverHomeSize) {
      setMoverError("Home size is required.");
      return;
    }

    setMoverSubmitting(true);

    try {
      const position = await getCurrentPositionOrNull();
      const created = await createMoverRequest({
        mover: moverId,
        property: propertyId,
        homeSize: moverHomeSize,
        message: moverMessage.trim(),
        preferredDate: moverPreferredDate || undefined,
        pickupLat: position?.lat,
        pickupLng: position?.lng,
      });
      setMoverSentId(moverId);
      setMoverPriceEstimate(created?.priceEstimate ?? null);
      setMoverRequestFormId(null);
      setMoverMessage("");
      setMoverPreferredDate("");
      setMoverHomeSize("");
    } catch (err) {
      setMoverError(err.message || "Could not send your mover request.");
    } finally {
      setMoverSubmitting(false);
    }
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

      if (!viewingDate || Number.isNaN(date.getTime()) || date <= new Date()) {
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

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewError("");
    setReviewSubmitting(true);

    try {
      await createReview({
        property: propertyId,
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });
      setReviewSent(true);
      setReviewComment("");
    } catch (err) {
      // Surfaced verbatim - this is where "you can only review a property
      // after a completed viewing" (the actual eligibility rule) reaches the
      // tenant, not a generic failure message.
      setReviewError(err.message || "Could not submit your review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReportSubmit = async (event, reviewId) => {
    event.preventDefault();
    setReportError("");

    if (!reportReason.trim()) {
      setReportError("A reason is required.");
      return;
    }

    setReportSubmitting(true);

    try {
      await reportReview(reviewId, reportReason.trim());
      setReportedReviewIds((current) => new Set(current).add(reviewId));
      setReportingReviewId(null);
      setReportReason("");
    } catch (err) {
      setReportError(err.message || "Could not submit this report.");
    } finally {
      setReportSubmitting(false);
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
          <p className="error-text">{error || "Property not found."}</p>
          <button className="secondary-button" type="button" onClick={onBack}>
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  // Landlords/agencies manage only their own listings (via Workspace) — they shouldn't
  // see other owners' listings here either, not just be blocked from browsing the list.
  const isOwnListing = String(property.owner?._id) === String(currentUser?._id);

  if (canManageListings(currentUser?.role) && !isOwnListing) {
    return (
      <div className="view active-view">
        <div className="panel">
          <p className="muted-copy">
            You can only view full details for your own listings. Manage them from the Workspace tab.
          </p>
          <button className="secondary-button" type="button" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const cost = property.costSummary || {};
  const contact = property.contact || {};
  const hasContactInfo =
    contact.phone || contact.email || contact.whatsapp || contact.availableHours || contact.notes;
  const isScheduled = property.viewingType === "scheduled";
  const preferredContactUrl = getPreferredContactUrl(contact);
  const hasMovers = propertyMovers.affiliates.length > 0 || propertyMovers.nearby.length > 0;

  const renderMoverCard = (mover) => (
    <article className="property-card" key={mover._id}>
      <div className="property-body">
        <h3 className="property-title">{mover.name}</h3>
        <p className="muted-copy">
          {(mover.serviceTypes || []).map((type) => formatStatusLabel(type)).join(", ") || "General moving"}
        </p>
        <div className="cost-row">
          <strong>{formatKes(mover.basePrice)}</strong>
          <span>base price</span>
        </div>
        {moverSentId === mover._id ? (
          <p className="muted-copy">
            Request sent — the mover will respond soon.
            {moverPriceEstimate ? ` Estimated price: ${formatKes(moverPriceEstimate)}.` : ""}
          </p>
        ) : moverRequestFormId === mover._id ? (
          <form className="auth-panel-form" onSubmit={(event) => handleMoverRequestSubmit(event, mover._id)}>
            <label>
              Home size
              <select value={moverHomeSize} onChange={(event) => setMoverHomeSize(event.target.value)} required>
                <option value="" disabled>
                  Select a home size
                </option>
                {homeSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Message
              <textarea
                rows={2}
                value={moverMessage}
                onChange={(event) => setMoverMessage(event.target.value)}
                maxLength={1000}
                required
              />
            </label>
            <label>
              Preferred date (optional)
              <input
                type="date"
                value={moverPreferredDate}
                onChange={(event) => setMoverPreferredDate(event.target.value)}
              />
            </label>
            {moverError && <p className="error-text">{moverError}</p>}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={moverSubmitting}>
                {moverSubmitting ? "Sending..." : "Send request"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setMoverRequestFormId(null);
                  setMoverError("");
                  setMoverHomeSize("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="card-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setMoverRequestFormId(mover._id);
                setMoverMessage("");
                setMoverPreferredDate("");
                setMoverHomeSize("");
                setMoverError("");
              }}
            >
              Request service
            </button>
          </div>
        )}
      </div>
    </article>
  );

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
          <PropertyImage src={getPropertyImage(property, apiBaseUrl)} alt={property.title || "Rental property"} eager />
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

        {property.owner?.name && (
          <p className="muted-copy owner-line">
            Listed by <strong>{property.owner.name}</strong>
            {property.owner.role === "agency" && property.owner.verified && (
              <span className="status-pill status-active verified-badge">Verified agency</span>
            )}
          </p>
        )}

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
                  <a href={buildPhoneUrl(contact.phone)}>{contact.phone}</a>
                </span>
              )}
              {contact.email && (
                <span>
                  <strong>Email</strong>
                  <a href={buildEmailUrl(contact.email)}>{contact.email}</a>
                </span>
              )}
              {contact.whatsapp && (
                <span>
                  <strong>WhatsApp</strong>
                  <a href={buildWhatsAppUrl(contact.whatsapp)} target="_blank" rel="noreferrer">
                    {contact.whatsapp}
                  </a>
                </span>
              )}
              {contact.availableHours && (
                <span>
                  <strong>Available</strong>
                  {contact.availableHours}
                </span>
              )}
            </div>
            {contact.notes && <p className="muted-copy">{contact.notes}</p>}
            {preferredContactUrl && (
              <a
                className="primary-button contact-cta"
                href={preferredContactUrl}
                target={contact.preferredMethod === "whatsapp" ? "_blank" : undefined}
                rel={contact.preferredMethod === "whatsapp" ? "noreferrer" : undefined}
              >
                Contact via {contactMethodLabels[contact.preferredMethod]}
              </a>
            )}
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

        {property.accessibilityFeatures?.length > 0 && (
          <>
            <h3>Accessibility features</h3>
            <div className="property-meta">
              {property.accessibilityFeatures.map((feature) => (
                <span key={feature}>{accessibilityFeatureLabels[feature] || feature}</span>
              ))}
            </div>
          </>
        )}

        <h3>Reviews</h3>
        {reviewsLoading ? (
          <p className="muted-copy">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="muted-copy">No reviews yet.</p>
        ) : (
          <div className="stack">
            {reviews.map((review) => {
              const isOwnReview = signedIn && String(review.user?._id) === String(currentUser?._id);
              const alreadyReported = reportedReviewIds.has(review._id);

              return (
                <div className="panel detail-panel" key={review._id}>
                  <p>
                    <strong>{review.user?.name || "Tenant"}</strong> — {review.rating}/5
                  </p>
                  {review.comment && <p>{review.comment}</p>}
                  <p className="muted-copy">{new Date(review.createdAt).toLocaleDateString()}</p>
                  {review.ownerResponse?.message && (
                    <p className="muted-copy">Owner response: {review.ownerResponse.message}</p>
                  )}
                  {signedIn && !isOwnReview && (
                    <>
                      {alreadyReported ? (
                        <p className="muted-copy">Reported — an admin will review it.</p>
                      ) : reportingReviewId === review._id ? (
                        <form className="stack" onSubmit={(event) => handleReportSubmit(event, review._id)}>
                          <label>
                            Why are you reporting this review?
                            <textarea
                              value={reportReason}
                              onChange={(event) => setReportReason(event.target.value)}
                              rows={2}
                              maxLength={500}
                            />
                          </label>
                          {reportError && <p className="error-text">{reportError}</p>}
                          <div className="form-actions">
                            <button className="primary-button" type="submit" disabled={reportSubmitting}>
                              {reportSubmitting ? "Submitting..." : "Submit report"}
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                setReportingReviewId(null);
                                setReportError("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            setReportingReviewId(review._id);
                            setReportReason("");
                            setReportError("");
                          }}
                        >
                          Report
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasMovers && (
          <>
            <h3>Movers for this move</h3>
            {propertyMovers.affiliates.length > 0 && (
              <>
                <h4>Recommended by the owner</h4>
                <div className="property-grid compact-grid">
                  {propertyMovers.affiliates.map(renderMoverCard)}
                </div>
              </>
            )}
            {propertyMovers.nearby.length > 0 && (
              <>
                <h4>Movers nearby</h4>
                <div className="property-grid compact-grid">{propertyMovers.nearby.map(renderMoverCard)}</div>
              </>
            )}
          </>
        )}

        <div className="card-actions">
          {signedIn && currentUser?.role === "tenant" && (
            <button
              className="primary-button"
              type="button"
              disabled={isSaved || saving}
              onClick={handleSave}
            >
              {saving ? "Saving..." : isSaved ? "Saved" : "Save"}
            </button>
          )}
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
          {signedIn && currentUser?.role === "tenant" && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setReviewSent(false);
                setReviewError("");
                openForm(activeForm === "review" ? null : "review");
              }}
            >
              Write a review
            </button>
          )}
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
              {inquiryError && <p className="error-text">{inquiryError}</p>}
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
              {viewingError && <p className="error-text">{viewingError}</p>}
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

      {activeForm === "review" && (
        <div className="panel detail-panel">
          {reviewSent ? (
            <>
              <h3>Review submitted</h3>
              <p className="muted-copy">Thanks for sharing your experience.</p>
            </>
          ) : (
            <form className="auth-panel-form" onSubmit={handleReviewSubmit}>
              <h3>Write a review</h3>
              <label>
                Rating
                <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)}>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} star{value === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Comment (optional)
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </label>
              {reviewError && <p className="error-text">{reviewError}</p>}
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? "Submitting..." : "Submit review"}
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
