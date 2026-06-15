export default function PrivacyPage() {
  return (
    <div className="view active-view legal-page">
      <div className="view-header">
        <div>
          <h2>Privacy policy</h2>
          <p>How KejaApp handles tenant, landlord, agency, and property data.</p>
        </div>
      </div>

      <section className="panel stack">
        <h3>Data we collect</h3>
        <p className="muted-copy">
          KejaApp collects account details such as name, email address, phone number, role, authentication data, saved homes, inquiries, viewing requests, reviews, notifications, property listings, listing images, and agency verification details when you provide them.
        </p>
        <p className="muted-copy">
          If location search is enabled in a mobile app, location is used only while the app is open to find nearby rentals. KejaApp should request approximate foreground location unless a specific map feature needs precise location.
        </p>
      </section>

      <section className="panel stack">
        <h3>How data is used and shared</h3>
        <p className="muted-copy">
          Data is used to operate rental search, account access, saved listings, owner workspaces, agency verification, safety moderation, notifications, inquiries, viewing requests, and support.
        </p>
        <p className="muted-copy">
          Tenant contact details are shared only with authorized landlords, agencies, or admins when needed for rental inquiries, viewing coordination, safety review, or support. KejaApp does not sell personal information to third parties.
        </p>
      </section>

      <section className="panel stack">
        <h3>Security and deletion</h3>
        <p className="muted-copy">
          Production deployments must use HTTPS so data is encrypted in transit between the app and KejaApp servers. Passwords are stored as hashes, and refresh sessions are stored using token hashes.
        </p>
        <p className="muted-copy">
          Users can delete their account from the Account page or visit the public Delete Account page to request deletion without reinstalling the app.
        </p>
      </section>
    </div>
  );
}
