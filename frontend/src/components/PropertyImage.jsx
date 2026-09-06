import { useState } from "react";

// Property photos can fail to load (a removed file, a broken URL, even the
// external Unsplash fallback in getPropertyImage() being unreachable) - the
// bare <img> previously had no error handling at all, so a failed load just
// rendered the browser's tiny default broken-image icon plus overflowing alt
// text against .property-photo's neutral background. This renders a fixed,
// local placeholder instead once the image actually fails, rather than
// pointing at yet another URL that could itself fail.
export default function PropertyImage({ src, alt, eager }) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="property-photo-fallback">
        <svg
          className="property-photo-fallback-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
        </svg>
        <span>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} onError={() => setErrored(true)} />
  );
}
