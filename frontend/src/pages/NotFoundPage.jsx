export default function NotFoundPage({ onBrowse }) {
  return (
    <div className="view active-view legal-page">
      <div className="view-header">
        <div>
          <h2>Page not found</h2>
          <p>There&apos;s nothing at this address.</p>
        </div>
      </div>

      <section className="panel stack">
        <p className="muted-copy">
          The page you&apos;re looking for may have moved or never existed. Check the address, or head back to
          Discover to keep browsing.
        </p>
        <button className="primary-button" type="button" onClick={onBrowse}>
          Go to Discover
        </button>
      </section>
    </div>
  );
}
