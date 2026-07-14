// Escapes regex metacharacters so a user-supplied search term is matched
// literally - without this, a query param could be crafted as a
// pathological regex (ReDoS) or as metacharacters that bypass a partial
// match filter.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export { escapeRegExp };
