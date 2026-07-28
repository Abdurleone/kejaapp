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
        <span aria-hidden="true">🏠</span>
        <span>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} onError={() => setErrored(true)} />
  );
}
