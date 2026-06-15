export default function DeleteAccountPage() {
  return (
    <div className="view active-view legal-page">
      <div className="view-header">
        <div>
          <h2>Delete account</h2>
          <p>Request removal of your KejaApp account and associated data.</p>
        </div>
      </div>

      <section className="panel stack">
        <h3>Signed-in users</h3>
        <p className="muted-copy">
          Open the Account page, type DELETE, and choose Delete my account. This removes your profile, sessions, saved homes, notifications, inquiries, viewing requests, reviews, agency verification records, and listings you own.
        </p>
      </section>

      <section className="panel stack">
        <h3>Web request</h3>
        <p className="muted-copy">
          If you cannot access the app, send a deletion request from the email address linked to your KejaApp account. Include your account email, phone number if present, and whether you registered as a tenant, landlord, or agency.
        </p>
        <a className="primary-button legal-action" href="mailto:privacy@kejaapp.com?subject=KejaApp%20account%20deletion%20request">
          Email deletion request
        </a>
      </section>
    </div>
  );
}
