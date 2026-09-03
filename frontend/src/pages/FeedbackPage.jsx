import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createFeedback,
  fetchAdminFeedback,
  fetchMyFeedback,
  formatStatusLabel,
  respondToFeedback,
  statusTone,
} from "../../app-utils.js";

function SubmitFeedbackPanel() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [message, setMessage] = useState("");
  const [allowPublicSharing, setAllowPublicSharing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchMyFeedback();
        if (active) setFeedback(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load your feedback.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [retryKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    try {
      const created = await createFeedback({ message, allowPublicSharing });
      setFeedback((current) => [created, ...current]);
      setMessage("");
      setAllowPublicSharing(false);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Could not submit your feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Feedback</h2>
          <p>Tell us how KejaApp helped you find your next home — an admin will respond here.</p>
        </div>
      </div>

      <div className="panel stack">
        <form className="auth-panel-form" onSubmit={handleSubmit}>
          <label>
            Your feedback
            <textarea
              rows={4}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setSubmitted(false);
              }}
              maxLength={1000}
              placeholder="Share your experience with KejaApp..."
              required
            />
          </label>
          <label className="radius-control">
            <input
              type="checkbox"
              checked={allowPublicSharing}
              onChange={(event) => setAllowPublicSharing(event.target.checked)}
            />
            Allow this to be shown as a testimonial on our landing page if an admin responds
          </label>
          {submitError && <p className="error-text">{submitError}</p>}
          {submitted && <p className="success-text">Thanks for sharing! We&apos;ll be in touch.</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={submitting || !message.trim()}>
              {submitting ? "Submitting..." : "Submit feedback"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel stack">
        <h3>Your submissions</h3>
        {loading ? (
          <div className="stack" role="status" aria-label="Loading your feedback">
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
          </div>
        ) : error ? (
          <div className="stack">
            <p className="error-text">{error}</p>
            <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Retry
            </button>
          </div>
        ) : feedback.length === 0 ? (
          <p className="muted-copy">You haven&apos;t submitted any feedback yet.</p>
        ) : (
          <div className="property-grid compact-grid">
            {feedback.map((item) => (
              <article className="property-card" key={item._id}>
                <div className="property-body">
                  <p>{item.message}</p>
                  <div className="cost-row">
                    <span className={`status-pill ${statusTone(item.status)}`}>
                      {formatStatusLabel(item.status)}
                    </span>
                  </div>
                  {item.response?.message && (
                    <p className="muted-copy">
                      <strong>Admin response:</strong> {item.response.message}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminFeedbackPanel() {
  const [feedback, setFeedback] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseError, setResponseError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const { feedback: data, pagination: paginationData } = await fetchAdminFeedback({ page });

        if (active) {
          setFeedback(data);
          setPagination(paginationData);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load feedback.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [page, retryKey]);

  const handleRespond = async (event, feedbackId) => {
    event.preventDefault();
    setResponseError("");
    setSubmitting(true);

    try {
      const updated = await respondToFeedback(feedbackId, { message: responseMessage });
      setFeedback((current) => current.map((item) => (item._id === feedbackId ? updated : item)));
      setSelectedId(null);
      setResponseMessage("");
    } catch (err) {
      setResponseError(err.message || "Could not send your response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Feedback</h2>
          <p>Respond to platform feedback from tenants, landlords, and agencies. Responses become public testimonials.</p>
        </div>
      </div>

      <div className="panel stack">
        {loading ? (
          <div className="stack" role="status" aria-label="Loading feedback">
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
            <span className="skeleton skeleton-line skeleton-line--full" aria-hidden="true" />
          </div>
        ) : error ? (
          <div className="stack">
            <p className="error-text">{error}</p>
            <button className="secondary-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Retry
            </button>
          </div>
        ) : feedback.length === 0 ? (
          <p className="muted-copy">No feedback submitted yet.</p>
        ) : (
          <div className="property-grid compact-grid">
            {feedback.map((item) => (
              <article className="property-card" key={item._id}>
                <div className="property-body">
                  <p>{item.message}</p>
                  <div className="cost-row">
                    <span>
                      {item.submitter?.name || "User"} ({formatStatusLabel(item.submitter?.role || "")})
                    </span>
                    <span className={`status-pill ${statusTone(item.status)}`}>
                      {formatStatusLabel(item.status)}
                    </span>
                  </div>
                  {item.response?.message ? (
                    <p className="muted-copy">
                      <strong>Your response:</strong> {item.response.message}
                    </p>
                  ) : selectedId === item._id ? (
                    <form className="auth-panel-form" onSubmit={(event) => handleRespond(event, item._id)}>
                      <label>
                        Response
                        <textarea
                          rows={3}
                          value={responseMessage}
                          onChange={(event) => setResponseMessage(event.target.value)}
                          maxLength={1000}
                          required
                        />
                      </label>
                      {responseError && <p className="error-text">{responseError}</p>}
                      <div className="form-actions">
                        <button className="primary-button" type="submit" disabled={submitting}>
                          {submitting ? "Sending..." : "Send response"}
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => {
                            setSelectedId(null);
                            setResponseMessage("");
                            setResponseError("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="form-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setSelectedId(item._id);
                          setResponseMessage("");
                          setResponseError("");
                        }}
                      >
                        Respond
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
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
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const { currentUser } = useAuth();
  if (currentUser?.role === "admin") {
    return <AdminFeedbackPanel />;
  }

  return <SubmitFeedbackPanel />;
}
