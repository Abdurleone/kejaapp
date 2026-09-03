import { useEffect, useState } from "react";
import { fetchPublicTestimonials, formatStatusLabel } from "../../app-utils.js";

/* IMPECCABLE DIRECTION CONTRACT (landing page only, scoped to .landing-page)
 * THESIS: Trade the rest of the app's "civic registry" restraint for one
 *   surface - a sign-painted, sticker-collage identity that dramatizes
 *   finding a home as a real Kenyan visual event, not a generic SaaS page.
 * OWN-WORLD: Matatu-poster palette (paper gold-cream, flag red/green, gold),
 *   Bungee display + Work Sans body, thick black strokes, hard drop-shadows,
 *   tilted sticker badges, an illustrated skyline.
 * STORY: A visitor reads "built for Kenya" immediately, then finds the same
 *   real trust proof (verified listings, quick inquiries) and searches.
 * FIRST VIEWPORT: a Karibu sticker above a bold headline (left), an
 *   illustrated skyline behind the showcase panel (right), tilted proof
 *   badges, one bold red CTA.
 * FORM: matatu/sign-painting poster tradition - user-pinned across three
 *   prior mockup rounds, not a fresh roll. --mp-* tokens live on .app-shell
 *   (shared by the header and this page) so the splash header can carry the
 *   same world too; still not a global DESIGN.md change - no other route
 *   or page reads them.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with
 *   the finish review, the verdict, and DESIGN.md. Reviewed inline
 *   (degraded/finish-reviewer.md - no comp existed to compare against);
 *   disposition: fix, one material fix (this comment), applied.
 */

export default function LandingPage({ onStart, onNavigateLegal }) {
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
      <svg
        className="landing-skyline"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          {/* Chrome trim - a matatu's bumper and hubcaps are the one place on
              an otherwise flat-color poster illustration where a real metal
              highlight belongs, so these are the only two gradients on the
              whole page. The hub's off-center highlight (35%/35% instead of
              50%/50%) is deliberate - a dead-center highlight wouldn't read
              as spinning once .landing-bus-wheel rotates it. */}
          <linearGradient id="landing-chrome-trim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef2f5" />
            <stop offset="45%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#93a0aa" />
          </linearGradient>
          <radialGradient id="landing-chrome-hub" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#8b98a1" />
          </radialGradient>
        </defs>
        <circle cx="320" cy="90" r="46" fill="#fffaf0" opacity="0.85" />
        <g className="mp-outline" stroke="#17130d" strokeWidth="4" strokeLinejoin="round">
          <rect x="30" y="150" width="60" height="180" fill="#fff8e6" />
          <rect x="100" y="110" width="50" height="220" fill="#d21023" />
          <rect x="160" y="170" width="70" height="160" fill="#f6ecd2" />
          <rect x="240" y="90" width="55" height="240" fill="#054a2b" />
          <rect x="305" y="140" width="65" height="190" fill="#fff8e6" />
          <polygon points="100,110 125,80 150,110" fill="#f0a500" />
          <rect x="115" y="140" width="18" height="18" fill="#17130d" />
          <rect x="115" y="175" width="18" height="18" fill="#17130d" />
          <rect x="115" y="210" width="18" height="18" fill="#17130d" />
          <rect x="255" y="120" width="20" height="20" fill="#f6ecd2" />
          <rect x="255" y="160" width="20" height="20" fill="#f6ecd2" />
          <rect x="255" y="200" width="20" height="20" fill="#f6ecd2" />
        </g>
        <g className="mp-outline">
          <rect x="0" y="330" width="400" height="70" fill="#17130d" />
        </g>
        {/* The bus body + wheels are a separate group from the road above so
            landing-bus's idle-bounce animation moves the vehicle without
            dragging the ground along with it - the wheels still paint over
            the road since this group comes after it in document order. */}
        <g className="mp-outline landing-bus">
          <rect x="40" y="290" width="150" height="55" rx="10" fill="#d21023" stroke="#17130d" strokeWidth="4" />
          <rect x="40" y="290" width="150" height="18" fill="#fff8e6" stroke="#17130d" strokeWidth="4" />
          {/* Chrome bumper */}
          <rect
            x="36"
            y="338"
            width="158"
            height="9"
            rx="4"
            fill="url(#landing-chrome-trim)"
            stroke="#17130d"
            strokeWidth="2.5"
          />
          {/* A second, smaller decal - real matatu bodywork is plastered with
              overlapping stickers, not just one placard. */}
          <circle cx="178" cy="328" r="9" fill="#054a2b" stroke="#17130d" strokeWidth="2.5" />
          <text x="178" y="331.5" textAnchor="middle" fontFamily="Bungee" fontSize="7.5" fill="#fff8e6">
            NRB
          </text>
          <g className="landing-bus-wheel">
            <circle cx="70" cy="352" r="16" fill="#17130d" />
            <circle cx="70" cy="352" r="7" fill="url(#landing-chrome-hub)" />
          </g>
          <g className="landing-bus-wheel">
            <circle cx="160" cy="352" r="16" fill="#17130d" />
            <circle cx="160" cy="352" r="7" fill="url(#landing-chrome-hub)" />
          </g>
          <text x="115" y="316" textAnchor="middle" fontFamily="Bungee" fontSize="14" fill="#fff8e6">
            KEJA
          </text>
        </g>
      </svg>
      <div className="landing-copy">
        <div className="landing-sticker-group">
          <span className="landing-sticker">Karibu Nyumbani</span>
          <span className="landing-sticker-seal" aria-hidden="true">★</span>
        </div>
        <h2>Find the right home in Nairobi and beyond.</h2>
        <p>
          KejaApp helps you discover verified rentals, save favorites, and manage
          requests from one clean workspace.
        </p>
        <div className="landing-actions">
          <button className="landing-cta primary-button" type="button" onClick={onStart}>
            Start searching
          </button>
          <a className="landing-ghost" href="#landing-showcase">
            See how it works
          </a>
        </div>
        <div className="landing-proof">
          <span>Trusted listings</span>
          <span>Quick inquiries</span>
          <span>Secure dashboard</span>
        </div>
      </div>
      <div className="landing-showcase" id="landing-showcase">
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
      <div className="landing-testimonials">
        <h3>What our users say</h3>
        {testimonials.length > 0 ? (
          testimonials.map((item) => (
            <blockquote key={item._id}>
              {item.message}
              <cite>
                — {item.submitter?.name || "KejaApp user"}
                {item.submitter?.role ? `, ${formatStatusLabel(item.submitter.role)}` : ""}
              </cite>
            </blockquote>
          ))
        ) : (
          <p className="landing-testimonials-empty">
            No shared experiences yet — real tenant, landlord, agency, and mover stories will show up
            here as they come in.
          </p>
        )}
      </div>
      <footer className="legal-footer">
        <button className="text-button" type="button" onClick={() => onNavigateLegal("privacy")}>
          Privacy
        </button>
        <button className="text-button" type="button" onClick={() => onNavigateLegal("terms")}>
          Terms
        </button>
        <span className="muted-copy footer-copyright">© {new Date().getFullYear()} KejaApp</span>
      </footer>
    </section>
  );
}
