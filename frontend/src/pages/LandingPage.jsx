import { useEffect, useState } from "react";
import { fetchPublicTestimonials, formatStatusLabel } from "../../app-utils.js";

export default function LandingPage({ onStart }) {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    let active = true;

    fetchPublicTestimonials()
      .then((data) => {
        if (active) setTestimonials(data);
      })
      .catch(() => {
        // Fail-soft: a marketing page shouldn't show an error state to signed-out visitors.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="landing-page">
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
      {testimonials.length > 0 && (
        <div className="landing-testimonials">
          <h3>What our users say</h3>
          {testimonials.map((item) => (
            <blockquote key={item._id}>
              {item.message}
              <cite>
                — {item.submitter?.name || "KejaApp user"}
                {item.submitter?.role ? `, ${formatStatusLabel(item.submitter.role)}` : ""}
              </cite>
            </blockquote>
          ))}
        </div>
      )}
    </section>
  );
}
