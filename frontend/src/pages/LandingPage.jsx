export default function LandingPage({ onStart }) {
  return (
    <section className="landing-page" onClick={onStart}>
      <div className="landing-copy">
        <h2>Find the right home in Nairobi and beyond.</h2>
        <p>
          KejaApp helps you discover verified rentals, save favorites, and manage
          requests from one clean workspace.
        </p>
        <div className="landing-proof">
          <span>Trusted listings</span>
          <span>Quick inquiries</span>
          <span>Secure dashboard</span>
        </div>
        <button className="landing-cta primary-button" type="button" onClick={onStart}>
          Start searching
        </button>
      </div>
      <div className="landing-showcase">
        <div>
          <strong>Browse curated properties</strong>
          <span>See the latest listings from agencies, owners and trusted landlords.</span>
        </div>
        <div>
          <strong>Save favorites</strong>
          <span>Keep your top rentals visible while you compare pricing and amenities.</span>
        </div>
        <div>
          <strong>Stay in control</strong>
          <span>Access the workspace view for saved properties and booking updates.</span>
        </div>
      </div>
    </section>
  );
}
