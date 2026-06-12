export default function WorkspacePage() {
  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <h2>Property workspace</h2>
          <p>Manage your listings, view inquiries, and keep track of active viewings.</p>
        </div>
      </div>

      <div className="panel">
        <h3>Owner dashboard</h3>
        <p className="muted-copy">
          This workspace will become the central hub for property owners and agents.
        </p>
        <div className="header-stats">
          <div>
            <strong>12</strong>
            <span>Active listings</span>
          </div>
          <div>
            <strong>4</strong>
            <span>New inquiries</span>
          </div>
          <div>
            <strong>3</strong>
            <span>Upcoming viewings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
