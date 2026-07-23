import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  affiliateMover,
  canManageListings,
  createMoverRequest,
  fetchMoverProfileStatus,
  fetchMovers,
  fetchReceivedMoverRequests,
  formatStatusLabel,
  formatKes,
  getCurrentPositionOrNull,
  homeSizeOptions,
  statusTone,
  submitMoverProfile,
  unaffiliateMover,
  updateMoverRequestStatus,
} from "../../app-utils.js";

const serviceTypeOptions = [
  { value: "", label: "Any service" },
  { value: "local", label: "Local move" },
  { value: "long_distance", label: "Long distance" },
  { value: "packing", label: "Packing" },
  { value: "storage", label: "Storage" },
  { value: "office", label: "Office move" },
  { value: "furniture", label: "Furniture" },
];

function MoverRequestForm({ moverId, onCancel, onSent }) {
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [homeSize, setHomeSize] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!homeSize) {
      setError("Home size is required.");
      return;
    }

    setSubmitting(true);

    try {
      const position = await getCurrentPositionOrNull();
      await createMoverRequest({
        mover: moverId,
        homeSize,
        message: message.trim(),
        preferredDate: preferredDate || undefined,
        pickupLat: position?.lat,
        pickupLng: position?.lng,
      });
      onSent();
    } catch (err) {
      setError(err.message || "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-panel-form" onSubmit={handleSubmit}>
      <label>
        Home size
        <select value={homeSize} onChange={(event) => setHomeSize(event.target.value)} required>
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
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          placeholder="Tell them about your move..."
          required
        />
      </label>
      <label>
        Preferred date (optional)
        <input type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} />
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={submitting || !message.trim()}>
          {submitting ? "Sending..." : "Send request"}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function MoverCard({ mover, currentUser, onRequireAuth, onAffiliateChange }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [affiliateBusy, setAffiliateBusy] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const isAffiliated = (mover.affiliatedOwners || []).some(
    (ownerId) => String(ownerId) === String(currentUser?._id)
  );

  const handleToggleAffiliate = async () => {
    setAffiliateError("");
    setAffiliateBusy(true);

    try {
      const updated = isAffiliated ? await unaffiliateMover(mover._id) : await affiliateMover(mover._id);
      onAffiliateChange(updated);
    } catch (err) {
      setAffiliateError(err.message || "Could not update affiliation.");
    } finally {
      setAffiliateBusy(false);
    }
  };

  return (
    <article className="property-card" key={mover._id}>
      <div className="property-body">
        <div className="cost-row">
          <h3 className="property-title">{mover.name}</h3>
          <span className={`status-pill ${statusTone(mover.verified ? "approved" : "pending")}`}>
            {mover.verified ? "Verified" : "Unverified"}
          </span>
        </div>
        <p className="muted-copy">
          {mover.location?.town || "Kenya"}, {mover.location?.county || ""}
        </p>
        <p className="muted-copy">
          {(mover.serviceTypes || []).map((type) => formatStatusLabel(type)).join(", ") || "General moving"}
        </p>
        <div className="cost-row">
          <strong>{formatKes(mover.basePrice)}</strong>
          <span>base price</span>
        </div>
        {mover.ratingCount > 0 && (
          <p className="muted-copy">
            {Number(mover.ratingAverage || 0).toFixed(1)} rating ({mover.ratingCount})
          </p>
        )}

        {canManageListings(currentUser?.role) && (
          <div className="form-actions">
            {affiliateError && <p className="error-text">{affiliateError}</p>}
            <button
              className="secondary-button"
              type="button"
              disabled={affiliateBusy}
              onClick={handleToggleAffiliate}
            >
              {affiliateBusy ? "Updating..." : isAffiliated ? "Remove affiliate" : "Add as affiliate"}
            </button>
          </div>
        )}

        {currentUser?.role === "tenant" &&
          (requestSent ? (
            <p className="muted-copy">Request sent — the mover will respond soon.</p>
          ) : requestOpen ? (
            <MoverRequestForm
              moverId={mover._id}
              onCancel={() => setRequestOpen(false)}
              onSent={() => {
                setRequestOpen(false);
                setRequestSent(true);
              }}
            />
          ) : (
            <div className="card-actions">
              <button className="primary-button" type="button" onClick={() => setRequestOpen(true)}>
                Request service
              </button>
            </div>
          ))}

        {!currentUser && (
          <div className="card-actions">
            <button className="primary-button" type="button" onClick={onRequireAuth}>
              Sign in to request service
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function MoverDirectory({ signedIn, onRequireAuth, currentUser }) {
  const [movers, setMovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [filters, setFilters] = useState({ serviceType: "", county: "", maxBasePrice: "" });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchMovers(filters);
        if (active) setMovers(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load movers.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [filters, retryKey]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleAffiliateChange = (updatedMover) => {
    setMovers((current) => current.map((mover) => (mover._id === updatedMover._id ? updatedMover : mover)));
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Movers</h2>
          <p>Find a moving or relocation service, or manage the movers you recommend to tenants.</p>
        </div>
        <div className="header-actions">
          <label className="radius-control">
            Service
            <select value={filters.serviceType} onChange={handleFilterChange("serviceType")}>
              {serviceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="radius-control">
            County
            <input type="text" value={filters.county} onChange={handleFilterChange("county")} placeholder="Nairobi" />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="stack" role="status" aria-label="Loading movers">
          <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
          <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="panel">
          <p className="error-text">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      ) : movers.length === 0 ? (
        <div className="panel empty-state">
          <h3>No movers found</h3>
          <p className="muted-copy">Try widening your filters.</p>
        </div>
      ) : (
        <div className="property-grid">
          {movers.map((mover) => (
            <MoverCard
              key={mover._id}
              mover={mover}
              currentUser={signedIn ? currentUser : null}
              onRequireAuth={onRequireAuth}
              onAffiliateChange={handleAffiliateChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const emptyProfileForm = {
  name: "",
  phone: "",
  email: "",
  serviceTypes: [],
  county: "",
  town: "",
  areasServed: "",
  basePrice: "",
};

function MoverProfilePanel({ profile, onSaved }) {
  const [editing, setEditing] = useState(profile.status === "not_submitted");
  const [form, setForm] = useState(() =>
    profile.status === "not_submitted"
      ? emptyProfileForm
      : {
          name: profile.name || "",
          phone: profile.phone || "",
          email: profile.email || "",
          serviceTypes: profile.serviceTypes || [],
          county: profile.location?.county || "",
          town: profile.location?.town || "",
          areasServed: (profile.location?.areasServed || []).join(", "),
          basePrice: profile.basePrice || "",
        }
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleServiceType = (value) => {
    setForm((current) => ({
      ...current,
      serviceTypes: current.serviceTypes.includes(value)
        ? current.serviceTypes.filter((type) => type !== value)
        : [...current.serviceTypes, value],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const updated = await submitMoverProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        serviceTypes: form.serviceTypes,
        basePrice: form.basePrice ? Number(form.basePrice) : undefined,
        location: {
          county: form.county.trim(),
          town: form.town.trim(),
          areasServed: form.areasServed
            .split(",")
            .map((area) => area.trim())
            .filter(Boolean),
        },
      });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Could not save your mover profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing) {
    return (
      <div className="panel stack">
        <div className="cost-row">
          <h3>{profile.name}</h3>
          <span className={`status-pill ${statusTone(profile.verified ? "approved" : "pending")}`}>
            {profile.verified ? "Verified" : "Not yet verified"}
          </span>
        </div>
        <p className="muted-copy">
          {(profile.serviceTypes || []).map((type) => formatStatusLabel(type)).join(", ") || "No services set"}
        </p>
        <p className="muted-copy">
          {profile.location?.town || "-"}, {profile.location?.county || "-"}
        </p>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel stack">
      <h3>Your mover profile</h3>
      <form className="auth-panel-form" onSubmit={handleSubmit}>
        <label>
          Business name
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <fieldset>
          <legend>Services offered</legend>
          {serviceTypeOptions
            .filter((option) => option.value)
            .map((option) => (
              <label key={option.value} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={form.serviceTypes.includes(option.value)}
                  onChange={() => toggleServiceType(option.value)}
                />
                {option.label}
              </label>
            ))}
        </fieldset>
        <label>
          County
          <input
            type="text"
            value={form.county}
            onChange={(event) => setForm((current) => ({ ...current, county: event.target.value }))}
          />
        </label>
        <label>
          Town
          <input
            type="text"
            value={form.town}
            onChange={(event) => setForm((current) => ({ ...current, town: event.target.value }))}
          />
        </label>
        <label>
          Areas served (comma separated)
          <input
            type="text"
            value={form.areasServed}
            onChange={(event) => setForm((current) => ({ ...current, areasServed: event.target.value }))}
          />
        </label>
        <label>
          Base price (KES)
          <input
            type="number"
            min="0"
            value={form.basePrice}
            onChange={(event) => setForm((current) => ({ ...current, basePrice: event.target.value }))}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save profile"}
          </button>
          {profile.status !== "not_submitted" && (
            <button className="secondary-button" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function MoverRequestRow({ request, onStatusChange, isHighlighted }) {
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rowRef = useRef(null);

  useEffect(() => {
    if (isHighlighted && typeof rowRef.current?.scrollIntoView === "function") {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const handleAction = async (status) => {
    setError("");
    setBusy(true);

    try {
      const updated = await updateMoverRequestStatus(request._id, { status, response: response.trim() });
      onStatusChange(updated);
    } catch (err) {
      setError(err.message || "Could not update this request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article ref={rowRef} className={`property-card${isHighlighted ? " property-card--highlighted" : ""}`}>
      <div className="property-body">
        <div className="cost-row">
          <h3 className="property-title">{request.tenant?.name || "Tenant"}</h3>
          <span className={`status-pill ${statusTone(request.status)}`}>{formatStatusLabel(request.status)}</span>
        </div>
        {request.property?.title && <p className="muted-copy">Re: {request.property.title}</p>}
        {request.homeSize && (
          <p className="muted-copy">
            Home size: {homeSizeOptions.find((option) => option.value === request.homeSize)?.label || request.homeSize}
          </p>
        )}
        {request.distanceKm !== undefined && (
          <p className="muted-copy">Pickup to drop-off: ~{request.distanceKm} km</p>
        )}
        {request.priceEstimate !== undefined && (
          <p className="muted-copy">Estimated price: {formatKes(request.priceEstimate)}</p>
        )}
        <p>{request.message}</p>
        {request.preferredDate && (
          <p className="muted-copy">Preferred date: {new Date(request.preferredDate).toLocaleDateString()}</p>
        )}
        {request.response && (
          <p className="muted-copy">
            <strong>Your response:</strong> {request.response}
          </p>
        )}
        {request.status === "pending" && (
          <>
            <label>
              Response (optional)
              <textarea rows={2} value={response} onChange={(event) => setResponse(event.target.value)} maxLength={1000} />
            </label>
            {error && <p className="error-text">{error}</p>}
            <div className="form-actions">
              <button className="primary-button" type="button" disabled={busy} onClick={() => handleAction("accepted")}>
                Accept
              </button>
              <button className="secondary-button" type="button" disabled={busy} onClick={() => handleAction("declined")}>
                Decline
              </button>
            </div>
          </>
        )}
        {request.status === "accepted" && (
          <div className="form-actions">
            <button className="secondary-button" type="button" disabled={busy} onClick={() => handleAction("completed")}>
              Mark completed
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function MoverDashboard({ highlightId }) {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [dismissedHighlightId, setDismissedHighlightId] = useState(null);
  const activeHighlightId = highlightId && highlightId !== dismissedHighlightId ? highlightId : null;

  useEffect(() => {
    if (!highlightId) return undefined;

    const timer = setTimeout(() => setDismissedHighlightId(highlightId), 5000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const profileData = await fetchMoverProfileStatus();
        if (!active) return;
        setProfile(profileData);

        if (profileData.status !== "not_submitted") {
          const requestsData = await fetchReceivedMoverRequests();
          if (active) setRequests(requestsData);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load your mover dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [retryKey]);

  const handleRequestStatusChange = (updated) => {
    setRequests((current) => current.map((request) => (request._id === updated._id ? updated : request)));
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Mover dashboard</h2>
          <p>Manage your business profile and respond to service requests from tenants.</p>
        </div>
      </div>

      {loading ? (
        <div className="stack" role="status" aria-label="Loading your mover dashboard">
          <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
          <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="panel">
          <p className="error-text">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <MoverProfilePanel profile={profile} onSaved={(updated) => setProfile(updated)} />

          {profile.status !== "not_submitted" && (
            <div className="panel stack">
              <h3>Received requests ({requests.length})</h3>
              {requests.length === 0 ? (
                <p className="muted-copy">No service requests yet.</p>
              ) : (
                <div className="property-grid compact-grid">
                  {requests.map((request) => (
                    <MoverRequestRow
                      key={request._id}
                      request={request}
                      onStatusChange={handleRequestStatusChange}
                      isHighlighted={request._id === activeHighlightId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MoversPage({ highlightId }) {
  const { signedIn, currentUser, openAuthPanel } = useAuth();

  if (currentUser?.role === "mover") {
    return <MoverDashboard highlightId={highlightId} />;
  }

  return <MoverDirectory signedIn={signedIn} onRequireAuth={openAuthPanel} currentUser={currentUser} />;
}
