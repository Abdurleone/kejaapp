// Strips anything that looks like an HTML tag from free-text fields before
// they're stored - a storage-time backstop, not a substitute for escaping
// on render. Nothing currently renders these fields unsafely (no
// dangerouslySetInnerHTML on web, React Native never interprets HTML at
// all), but that's a render-time guarantee that could silently stop being
// true one call site at a time; this means stored content itself never
// carries markup regardless. Not a full HTML parser - deliberately simple
// (no ReDoS-prone nested quantifiers) since the goal is "no tags survive",
// not perfect malformed-HTML recovery.
const sanitizeText = (value) => (typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim() : value);

export { sanitizeText };
