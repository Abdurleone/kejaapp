export default function PaginationFooter({ pagination, page, onPageChange }) {
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
