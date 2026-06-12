const fallbackImage =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70";

export const defaultApiBaseUrl = "http://localhost:5000";

export const normalizeApiBaseUrl = (value) => {
  const baseUrl = String(value || "").trim() || defaultApiBaseUrl;
  return baseUrl.replace(/\/+$/, "");
};

export const createApiUrl = (path, baseUrl = defaultApiBaseUrl) => {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
};

const storage = {
  get baseUrl() {
    return normalizeApiBaseUrl(localStorage.getItem("keja_base_url") || defaultApiBaseUrl);
  },
  set baseUrl(value) {
    localStorage.setItem("keja_base_url", normalizeApiBaseUrl(value));
  },
  get token() {
    return localStorage.getItem("keja_token") || "";
  },
  set token(value) {
    value ? localStorage.setItem("keja_token", value) : localStorage.removeItem("keja_token");
  },
  get refreshToken() {
    return localStorage.getItem("keja_refresh") || "";
  },
  set refreshToken(value) {
    value ? localStorage.setItem("keja_refresh", value) : localStorage.removeItem("keja_refresh");
  },
  get user() {
    const value = localStorage.getItem("keja_user");
    return value ? JSON.parse(value) : null;
  },
  set user(value) {
    value ? localStorage.setItem("keja_user", JSON.stringify(value)) : localStorage.removeItem("keja_user");
  },
  get theme() {
    return localStorage.getItem("keja_theme") || "default";
  },
  set theme(value) {
    localStorage.setItem("keja_theme", value);
  },
  get colorMode() {
    return localStorage.getItem("keja_color_mode") || "light";
  },
  set colorMode(value) {
    localStorage.setItem("keja_color_mode", value);
  },
};

export const formatKes = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const resolveAssetUrl = (url, baseUrl) => {
  if (!url) {
    return fallbackImage;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${baseUrl.replace(/\/$/, "")}${url}`;
};

export const getPropertyImage = (property, baseUrl = defaultApiBaseUrl) =>
  resolveAssetUrl(property.images?.[0]?.url, baseUrl);

export const statusTone = (status) => {
  if (status === "available" || status === "active" || status === "approved") {
    return "status-active";
  }

  if (status === "taken" || status === "suspended" || status === "pending") {
    return "status-suspended";
  }

  return "status-banned";
};

export const formatStatusLabel = (value) =>
  String(value || "")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatRatingSummary = (ratingAverage, ratingCount) => {
  const count = Number(ratingCount || 0);

  if (!count) {
    return "No ratings";
  }

  return `${Number(ratingAverage || 0).toFixed(1)} rating (${count})`;
};

export const summarizeProperties = (properties) => {
  const rents = properties
    .map((property) => Number(property.price?.rent || 0))
    .filter((rent) => rent > 0)
    .sort((a, b) => a - b);
  const medianRent = rents.length ? rents[Math.floor((rents.length - 1) / 2)] : 0;
  const openViewings = properties.filter((property) => property.viewingType === "open").length;
  const scheduledViewings = properties.filter((property) => property.viewingType === "scheduled").length;
  const areas = new Set(properties.map((property) => property.location?.area).filter(Boolean));

  return {
    total: properties.length,
    medianRent,
    openViewings,
    scheduledViewings,
    areaCount: areas.size,
  };
};

export const summarizeReview = (review) => {
  const propertyTitle = review.property?.title || "Property";
  const reviewer = review.user?.name || "Tenant";
  const rating = Number(review.rating || 0);

  return `${propertyTitle} - ${rating}/5 by ${reviewer}`;
};

export const sortProperties = (properties, sortMode) => {
  const sorted = [...properties];

  if (sortMode === "rent-asc") {
    return sorted.sort((a, b) => Number(a.price?.rent || 0) - Number(b.price?.rent || 0));
  }

  if (sortMode === "rent-desc") {
    return sorted.sort((a, b) => Number(b.price?.rent || 0) - Number(a.price?.rent || 0));
  }

  return sorted;
};

export const nextTheme = (theme) => (theme === "kenya" ? "default" : "kenya");

export const nextColorMode = (mode) => (mode === "dark" ? "light" : "dark");

export const demoAccounts = {
  tenant: "tenant@example.com",
  landlord: "landlord@example.com",
  agency: "agency@example.com",
  admin: "admin@example.com",
};

export const getDemoEmailForRole = (role) => demoAccounts[role] || demoAccounts.tenant;

export const canRegisterRole = (role) => ["tenant", "landlord", "agency"].includes(role);

const roleViewAccess = {
  tenant: ["discover", "saved"],
  landlord: ["owner"],
  agency: ["owner"],
  admin: ["admin", "owner"],
};

export const canAccessView = (role, view) => {
  if (!role) {
    return view === "discover";
  }

  return Boolean(roleViewAccess[role]?.includes(view));
};

export const getDefaultViewForRole = (role) => roleViewAccess[role]?.[0] || "discover";

export const canUseTenantPropertyActions = (role) => role === "tenant";

export const canManageListings = (role) => ["landlord", "agency", "admin"].includes(role);

export const canSearchListings = (role) => !role || role === "tenant";

export const canOpenPropertyDetails = (role) => role === "tenant";

export const shouldShowSplash = ({ isSignedIn, path = "/" }) => !isSignedIn && String(path || "/").replace(/\/$/, "") === "";

const viewPaths = {
  discover: "/search",
  saved: "/saved",
  owner: "/owner",
  admin: "/admin",
};

export const resolveViewFromPath = (path) => {
  const normalizedPath = path === "/" ? "/" : String(path || "").replace(/\/$/, "");

  if (normalizedPath === "/") {
    return "discover";
  }

  const match = Object.entries(viewPaths).find(([, viewPath]) => viewPath === normalizedPath);
  return match?.[0] || "discover";
};

export const getViewPath = (view) => viewPaths[view] || viewPaths.discover;

export const findPropertyById = (collections, propertyId) =>
  collections.flat().find((property) => String(property?._id || property?.id) === String(propertyId));

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

const state = {
  properties: [],
  favorites: [],
  currentView: "discover",
  propertySort: "newest",
};

const showToast = (message) => {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
};

const promptTaskbarAuth = () => {
  const authBar = qs(".connection-bar");
  authBar.classList.add("auth-nudge");
  qs("#roleLogin").focus();
  authBar.scrollIntoView({ behavior: "smooth", block: "center" });
  window.clearTimeout(promptTaskbarAuth.timer);
  promptTaskbarAuth.timer = window.setTimeout(() => authBar.classList.remove("auth-nudge"), 2200);
};

const setApiStatus = (status, label) => {
  const apiState = qs("#apiState");

  if (!apiState) {
    return;
  }

  apiState.textContent = label;
  apiState.dataset.status = status;
};

const apiRequest = async (path, options = {}) => {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(storage.token ? { Authorization: `Bearer ${storage.token}` } : {}),
    ...(options.headers || {}),
  };
  let response;

  try {
    response = await fetch(createApiUrl(path, storage.baseUrl), {
      ...options,
      credentials: "include",
      headers,
    });
  } catch {
    setApiStatus("offline", "API offline");
    throw new Error(`Could not reach API at ${storage.baseUrl}`);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    setApiStatus("error", "API error");
    throw new Error(body?.message || `Request failed with ${response.status}`);
  }

  setApiStatus("online", "API online");
  return body;
};

const setSession = ({ user, token, refreshToken }) => {
  storage.user = user;
  storage.token = token;
  storage.refreshToken = refreshToken;
  renderSession();
  renderRoleAccess();
  renderAuthGate();
};

const clearSession = () => {
  storage.user = null;
  storage.token = "";
  storage.refreshToken = "";
  renderSession();
  renderRoleAccess();
  renderAuthGate();
};

const renderSession = () => {
  const user = storage.user;
  const sessionState = qs("#sessionState");
  sessionState.textContent = user ? `${user.role}: ${user.name}` : "Guest";
  sessionState.classList.toggle("muted", !user);
};

const renderAuthGate = () => {
  const isSignedIn = Boolean(storage.user && storage.token);
  const showSplash = shouldShowSplash({
    isSignedIn,
    path: typeof window === "undefined" ? "/" : window.location.pathname,
  });

  qs(".app-header").hidden = showSplash;
  qs("#landingPage").hidden = !showSplash;
  qs("#appShell").hidden = showSplash;
  qs("#logoutButton").hidden = !isSignedIn;
  qs("#signInButton").hidden = isSignedIn;
  qs("#signUpButton").hidden = isSignedIn;
  qs("#roleLogin").hidden = isSignedIn;
};

const renderRoleAccess = () => {
  const role = storage.user?.role;

  qsa(".tab").forEach((tab) => {
    tab.hidden = !canAccessView(role, tab.dataset.view);
  });

  qs("#propertyForm").hidden = !canManageListings(role);
  qs("#filterPanel").hidden = !canSearchListings(role);
  qs("#ownerViewTitle").textContent = role === "admin" ? "Listing management" : "Owner tools";
  qs("#ownerViewCopy").textContent =
    role === "admin" ? "Review and manage all property listings." : "Create and review your property inventory.";
};

const applyTheme = (theme = storage.theme) => {
  document.documentElement.dataset.theme = theme;
  qs("#themeToggle span").textContent = theme === "kenya" ? "STD" : "KE";
  qs("#themeToggle").setAttribute(
    "aria-label",
    theme === "kenya" ? "Switch to standard theme" : "Switch to Kenyan flag theme"
  );
};

const applyColorMode = (mode = storage.colorMode) => {
  document.documentElement.dataset.colorMode = mode;
  qsa('input[name="colorMode"]').forEach((input) => {
    input.checked = input.value === mode;
  });
};

const renderMetrics = (summary) => {
  if (!summary) {
    qs("#dashboard").innerHTML = `<p class="muted-copy">Sign in to load your summary.</p>`;
    return;
  }

  const metrics = [
    ["Role", summary.role],
    ["Unread", summary.notifications?.unread || 0],
  ];

  if (summary.tenant) {
    metrics.push(["Saved", summary.tenant.savedProperties]);
    metrics.push(["Inquiries", summary.tenant.inquiries.open + summary.tenant.inquiries.responded]);
    metrics.push(["Viewings", summary.tenant.viewings.pending + summary.tenant.viewings.approved]);
  }

  if (summary.owner) {
    metrics.push(["Available", summary.owner.properties.available]);
    metrics.push(["Taken", summary.owner.properties.taken]);
    metrics.push(["Incoming", summary.owner.incomingInquiries.open]);
  }

  if (summary.admin) {
    metrics.push(["Violations", summary.admin.violations.open]);
    metrics.push(["Verifications", summary.admin.agencyVerifications.pending]);
  }

  qs("#dashboard").innerHTML = metrics
    .map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
};

const propertyCostText = (property) => {
  const summary = property.costSummary;

  if (!summary) {
    return "";
  }

  return `
    <div class="cost-row">
      <span><strong>${formatKes(summary.upfrontTotal)}</strong> upfront</span>
      <span><strong>${formatKes(summary.monthlyTotal)}</strong> monthly</span>
    </div>
  `;
};

const renderPropertyInsights = () => {
  const insights = summarizeProperties(state.properties);
  qs("#propertyInsights").innerHTML = [
    ["Listings", insights.total],
    ["Median rent", formatKes(insights.medianRent)],
    ["Open viewings", insights.openViewings],
    ["Areas", insights.areaCount],
  ]
    .map(
      ([label, value]) => `
        <div class="insight">
          <strong>${value}</strong>
          <span>${label}</span>
        </div>
      `
    )
    .join("");
};

const renderPropertyCard = (property, options = {}) => {
  const location = [property.location?.area, property.location?.town, property.location?.county]
    .filter(Boolean)
    .join(", ");
  const imageUrl = getPropertyImage(property, storage.baseUrl);
  const id = property._id || property.id;
  const amenities = (property.amenities || []).slice(0, 3);
  const role = storage.user?.role;
  const ratingSummary = formatRatingSummary(property.ratingAverage, property.ratingCount);
  const contactMethod = property.contact?.preferredMethod
    ? formatStatusLabel(property.contact.preferredMethod)
    : "In-app";
  const actions = options.owner
    ? `<button class="secondary-button" data-status="${id}" data-next-status="taken">Mark taken</button>`
    : canUseTenantPropertyActions(role)
      ? `
      <button class="secondary-button" data-detail="${id}">Details</button>
      <button class="secondary-button" data-save="${id}">Save</button>
      <button class="secondary-button" data-inquire="${id}">Inquire</button>
      <button class="secondary-button" data-viewing="${id}">Viewing</button>
    `
      : !role
        ? `
      <button class="secondary-button" data-auth-required="details">Details</button>
      <button class="secondary-button" data-auth-required="save">Save</button>
      <button class="secondary-button" data-auth-required="inquire">Inquire</button>
      <button class="secondary-button" data-auth-required="viewing">Viewing</button>
    `
        : `<span class="muted-copy">View-only access</span>`;

  return `
    <article class="property-card">
      <div class="property-photo">
        <img src="${imageUrl}" alt="${property.images?.[0]?.alt || property.title}" />
        <div class="photo-badges">
          <span class="pill">${formatStatusLabel(property.viewingType || "scheduled")}</span>
          <span class="rating-badge">${ratingSummary}</span>
        </div>
      </div>
      <div class="property-body">
        <div>
          <h3 class="property-title">${property.title}</h3>
          <p class="property-meta">${location || "Location pending"}</p>
        </div>
        <div class="price-line">
          <div class="price">${formatKes(property.price?.rent)}</div>
          <span class="mini-chip ${statusTone(property.status)}">${formatStatusLabel(property.status || "available")}</span>
        </div>
        ${propertyCostText(property)}
        <div class="mini-meta">
          <span>${property.bedrooms || 0} beds</span>
          <span>${property.bathrooms || 0} baths</span>
          <span>${formatStatusLabel(property.listedBy || "owner")}</span>
          <span>${contactMethod}</span>
        </div>
        ${
          amenities.length
            ? `<div class="amenity-row">${amenities.map((amenity) => `<span>${formatStatusLabel(amenity)}</span>`).join("")}</div>`
            : ""
        }
        <div class="card-actions">${actions}</div>
      </div>
    </article>
  `;
};

const renderReviewRows = (reviews, options = {}) =>
  reviews.length
    ? reviews
        .map((review) => {
          const id = review._id || review.id;
          const response = review.ownerResponse?.message;
          const canRespond = options.respond && !response;

          return `
            <article class="review-row">
              <div>
                <div class="review-heading">
                  <strong>${summarizeReview(review)}</strong>
                  <span>${Number(review.rating || 0)}/5</span>
                </div>
                <p>${review.comment || "No comment provided."}</p>
                ${
                  response
                    ? `<p class="owner-response"><span>Owner response</span>${response}</p>`
                    : `<p class="muted-copy">No owner response yet.</p>`
                }
              </div>
              ${
                canRespond
                  ? `<button class="secondary-button" data-review-response="${id}" type="button">Respond</button>`
                  : `<span class="mini-chip">Read only</span>`
              }
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No reviews yet.</div>`;

const renderProperties = () => {
  if (!canSearchListings(storage.user?.role)) {
    qs("#propertyCount").textContent = "Tenant search only";
    qs("#propertyInsights").innerHTML = "";
    qs("#properties").innerHTML = `<div class="empty-state">Only tenant accounts can search available listings.</div>`;
    return;
  }

  const properties = sortProperties(state.properties, state.propertySort);
  qs("#propertyCount").textContent = `${state.properties.length} listings ready to compare`;
  renderPropertyInsights();
  qs("#properties").innerHTML = properties.length
    ? properties.map((property) => renderPropertyCard(property)).join("")
    : `<div class="empty-state">No properties found. Try clearing the filters.</div>`;
};

const loadProperties = async () => {
  if (!canSearchListings(storage.user?.role)) {
    renderProperties();
    return;
  }

  qs("#propertyCount").textContent = "Loading listings...";
  qs("#properties").innerHTML = Array.from({ length: 6 }, () => `<div class="skeleton-card"></div>`).join("");
  const filters = {
    search: qs("#search").value,
    county: qs("#county").value,
    area: qs("#area").value,
    minRent: qs("#minRent").value,
    maxRent: qs("#maxRent").value,
    viewingType: qs("#viewingType").value,
  };
  const body = await apiRequest(`/api/properties${buildQueryString(filters)}`);
  state.properties = body.data || [];
  renderProperties();
};

const loadDashboard = async () => {
  if (!storage.token) {
    renderMetrics(null);
    return;
  }

  const body = await apiRequest("/api/dashboard/summary");
  renderMetrics(body.data);
};

const loadFavorites = async () => {
  qs("#favorites").innerHTML = Array.from({ length: 3 }, () => `<div class="skeleton-card"></div>`).join("");
  const body = await apiRequest("/api/favorites");
  state.favorites = body.data || [];
  const properties = state.favorites.map((favorite) => favorite.property).filter(Boolean);
  qs("#favorites").innerHTML = properties.length
    ? properties.map((property) => renderPropertyCard(property)).join("")
    : `<div class="empty-state">No saved properties yet.</div>`;
};

const loadMyProperties = async () => {
  qs("#myProperties").innerHTML = Array.from({ length: 3 }, () => `<div class="skeleton-card"></div>`).join("");
  const body = await apiRequest("/api/properties/mine?limit=50");
  const properties = body.data || [];
  qs("#myProperties").innerHTML = properties.length
    ? properties.map((property) => renderPropertyCard(property, { owner: true })).join("")
    : `<div class="empty-state">Your listings will appear here.</div>`;
};

const loadOwnerReviews = async () => {
  qs("#ownerReviews").innerHTML = `<div class="empty-state">Loading reviews...</div>`;
  const body = await apiRequest("/api/reviews/mine");
  const reviews = body.data || [];
  qs("#ownerReviews").innerHTML = renderReviewRows(reviews, {
    respond: ["landlord", "agency"].includes(storage.user?.role),
  });
};

const loadUsers = async () => {
  qs("#adminUsers").innerHTML = `<div class="empty-state">Loading users...</div>`;
  const body = await apiRequest("/api/admin/users?limit=20");
  const users = body.data || [];
  qs("#adminUsers").innerHTML = users.length
    ? users
        .map(
          (user) => `
            <div class="user-row">
              <div>
                <strong>${user.name}</strong>
                <p class="muted-copy">${user.email}</p>
              </div>
              <span>${formatStatusLabel(user.role)}</span>
              <span class="${statusTone(user.accountStatus || "active")}">${formatStatusLabel(user.accountStatus || "active")}</span>
              <select data-user-status="${user._id}">
                <option value="">Change status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">No users returned.</div>`;
};

const loadAdminReviews = async () => {
  qs("#adminReviews").innerHTML = `<div class="empty-state">Loading reviews...</div>`;
  const body = await apiRequest("/api/admin/reviews");
  const reviews = body.data || [];
  qs("#adminReviews").innerHTML = renderReviewRows(reviews, { respond: false });
};

const openActionDialog = (title, html) => {
  qs("#dialogTitle").textContent = title;
  qs("#dialogBody").innerHTML = html;
  qs("#actionDialog").showModal();
};

const renderPropertyDetail = (property, reviews = []) => {
  const location = [property.location?.area, property.location?.town, property.location?.county]
    .filter(Boolean)
    .join(", ");
  const imageUrl = getPropertyImage(property, storage.baseUrl);
  const amenities = property.amenities || [];
  const contact = property.contact || {};
  const contactRows = [
    contact.phone ? ["Phone", contact.phone] : null,
    contact.whatsapp ? ["WhatsApp", contact.whatsapp] : null,
    contact.email ? ["Email", contact.email] : null,
    contact.availableHours ? ["Hours", contact.availableHours] : null,
    contact.notes ? ["Notes", contact.notes] : null,
  ].filter(Boolean);

  return `
    <div class="property-detail">
      <img src="${imageUrl}" alt="${property.images?.[0]?.alt || property.title}" />
      <div class="property-detail-body">
        <div class="stack">
          <span class="pill">${formatStatusLabel(property.viewingType || "scheduled")} viewing</span>
          <h3>${property.title}</h3>
          <p class="muted-copy">${location || "Location pending"}</p>
        </div>
        <div class="detail-grid">
          <span><strong>${formatKes(property.price?.rent)}</strong> rent</span>
          <span><strong>${formatKes(property.price?.deposit)}</strong> deposit</span>
          <span><strong>${property.bedrooms || 0}</strong> bedrooms</span>
          <span><strong>${property.bathrooms || 0}</strong> bathrooms</span>
        </div>
        ${propertyCostText(property)}
        <p>${property.description || "No description provided yet."}</p>
        ${
          amenities.length
            ? `<div class="amenity-row">${amenities.map((amenity) => `<span>${formatStatusLabel(amenity)}</span>`).join("")}</div>`
            : ""
        }
        <section class="detail-section">
          <h4>Contact after sign-in</h4>
          ${
            contactRows.length
              ? contactRows.map(([label, value]) => `<p><strong>${label}:</strong> ${value}</p>`).join("")
              : `<p class="muted-copy">Use an inquiry or viewing request so the owner can respond from the app.</p>`
          }
        </section>
        <section class="detail-section">
          <h4>Reviews</h4>
          ${
            reviews.length
              ? reviews
                  .slice(0, 3)
                  .map(
                    (review) => `
                      <p><strong>${Number(review.rating || 0)}/5</strong> ${review.comment || "No comment provided."}</p>
                    `
                  )
                  .join("")
              : `<p class="muted-copy">No reviews yet.</p>`
          }
        </section>
      </div>
    </div>
  `;
};

const openPropertyDetails = async (propertyId) => {
  let property = findPropertyById(
    [
      state.properties,
      state.favorites.map((favorite) => favorite.property).filter(Boolean),
    ],
    propertyId
  );

  if (!property) {
    const body = await apiRequest(`/api/properties/${propertyId}`);
    property = body.data;
  }

  const reviewsBody = await apiRequest(`/api/properties/${propertyId}/reviews`).catch(() => ({ data: [] }));
  openActionDialog(property.title || "Property details", renderPropertyDetail(property, reviewsBody.data || []));
};

const respondToReview = async (reviewId) => {
  const message = qs("#reviewResponseMessage").value;
  await apiRequest(`/api/reviews/${reviewId}/response`, {
    method: "PUT",
    body: JSON.stringify({ message }),
  });
  qs("#actionDialog").close();
  showToast("Review response saved");
  loadOwnerReviews();
};

const signInWithSelectedRole = async () => {
  const email = getDemoEmailForRole(qs("#roleLogin").value);
  const body = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: "password123",
    }),
  });

  setSession(body);
  showToast(`Signed in as ${formatStatusLabel(body.user.role)}`);
  switchView(resolveViewFromPath(window.location.pathname), { pushState: false });

  if (canSearchListings(storage.user?.role)) {
    loadProperties().catch((error) => showToast(error.message));
  }

  loadDashboard();
};

const createAccount = async () => {
  const role = qs("#signupRole").value;
  const body = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: qs("#signupName").value,
      email: qs("#signupEmail").value,
      password: qs("#signupPassword").value,
      phone: qs("#signupPhone").value,
      role,
    }),
  });

  setSession(body);
  qs("#actionDialog").close();
  showToast(`Account created as ${formatStatusLabel(body.user.role)}`);
  switchView(resolveViewFromPath(window.location.pathname), { pushState: false });

  if (canSearchListings(storage.user?.role)) {
    loadProperties().catch((error) => showToast(error.message));
  }

  loadDashboard();
};

const openSignUpDialog = () => {
  const selectedRole = canRegisterRole(qs("#roleLogin").value) ? qs("#roleLogin").value : "tenant";

  openActionDialog(
    "Create account",
    `
      <div class="stack">
        <input id="signupName" type="text" placeholder="Full name or business name" />
        <input id="signupEmail" type="email" placeholder="Email" />
        <input id="signupPassword" type="password" placeholder="Password, 8+ characters" />
        <input id="signupPhone" type="tel" placeholder="Phone optional" />
        <select id="signupRole">
          <option value="tenant"${selectedRole === "tenant" ? " selected" : ""}>Tenant</option>
          <option value="landlord"${selectedRole === "landlord" ? " selected" : ""}>Landlord</option>
          <option value="agency"${selectedRole === "agency" ? " selected" : ""}>Agency</option>
        </select>
        <div class="dialog-actions">
          <button class="primary-button" type="button" id="createAccountButton">Create account</button>
        </div>
      </div>
    `
  );
  qs("#signupName").focus();
  qs("#createAccountButton").addEventListener("click", () => createAccount().catch((error) => showToast(error.message)));
};

const enterApp = () => {
  if (typeof window !== "undefined" && window.location.pathname !== getViewPath("discover")) {
    window.history.pushState({ view: "discover" }, "", getViewPath("discover"));
  }

  renderAuthGate();
  switchView("discover", { pushState: false });
  loadProperties().catch((error) => showToast(error.message));
};

const createInquiry = async (propertyId) => {
  const subject = qs("#inquirySubject").value;
  const message = qs("#inquiryMessage").value;
  const contactPreference = qs("#contactPreference").value;
  await apiRequest("/api/inquiries", {
    method: "POST",
    body: JSON.stringify({ property: propertyId, subject, message, contactPreference }),
  });
  qs("#actionDialog").close();
  showToast("Inquiry sent");
};

const createViewing = async (propertyId) => {
  const requestedDate = qs("#requestedDate").value;
  const message = qs("#viewingMessage").value;
  await apiRequest("/api/viewings", {
    method: "POST",
    body: JSON.stringify({
      property: propertyId,
      requestedDate: requestedDate ? new Date(requestedDate).toISOString() : undefined,
      message,
    }),
  });
  qs("#actionDialog").close();
  showToast("Viewing request sent");
};

const bindPropertyActions = (event) => {
  const authAction = event.target.closest("[data-auth-required]")?.dataset.authRequired;
  const detailId = event.target.closest("[data-detail]")?.dataset.detail;
  const saveId = event.target.closest("[data-save]")?.dataset.save;
  const inquiryId = event.target.closest("[data-inquire]")?.dataset.inquire;
  const viewingId = event.target.closest("[data-viewing]")?.dataset.viewing;
  const statusId = event.target.closest("[data-status]")?.dataset.status;

  if (authAction) {
    showToast("Sign in or sign up to contact this property owner");
    promptTaskbarAuth();
    return;
  }

  if (detailId) {
    if (!canOpenPropertyDetails(storage.user?.role)) {
      showToast("Sign in as a tenant to open listing details");
      promptTaskbarAuth();
      return;
    }

    openPropertyDetails(detailId).catch((error) => showToast(error.message));
  }

  if (saveId) {
    apiRequest(`/api/favorites/${saveId}`, { method: "POST" })
      .then(() => showToast("Property saved"))
      .catch((error) => showToast(error.message));
  }

  if (inquiryId) {
    openActionDialog(
      "Send inquiry",
      `
        <div class="stack">
          <input id="inquirySubject" value="Availability question" />
          <textarea id="inquiryMessage">Is this property still available?</textarea>
          <select id="contactPreference">
            <option value="in_app">In app</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
          </select>
          <div class="dialog-actions">
            <button class="primary-button" type="button" id="sendInquiry">Send</button>
          </div>
        </div>
      `
    );
    qs("#sendInquiry").addEventListener("click", () => createInquiry(inquiryId));
  }

  if (viewingId) {
    openActionDialog(
      "Request viewing",
      `
        <div class="stack">
          <input id="requestedDate" type="datetime-local" />
          <textarea id="viewingMessage">I would like to view this property.</textarea>
          <div class="dialog-actions">
            <button class="primary-button" type="button" id="sendViewing">Request</button>
          </div>
        </div>
      `
    );
    qs("#sendViewing").addEventListener("click", () => createViewing(viewingId));
  }

  if (statusId) {
    apiRequest(`/api/properties/${statusId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "taken" }),
    })
      .then(() => {
        showToast("Property marked taken");
        loadMyProperties();
      })
      .catch((error) => showToast(error.message));
  }
};

const bindReviewActions = (event) => {
  const reviewId = event.target.closest("[data-review-response]")?.dataset.reviewResponse;

  if (!reviewId) {
    return;
  }

  openActionDialog(
    "Respond to review",
    `
      <div class="stack">
        <textarea id="reviewResponseMessage" placeholder="Write a clear owner response"></textarea>
        <div class="dialog-actions">
          <button class="primary-button" type="button" id="sendReviewResponse">Respond</button>
        </div>
      </div>
    `
  );
  qs("#sendReviewResponse").addEventListener("click", () => respondToReview(reviewId).catch((error) => showToast(error.message)));
};

const createProperty = async (event) => {
  event.preventDefault();

  if (!canManageListings(storage.user?.role)) {
    showToast("Only landlords, agencies, and admins can create listings");
    return;
  }

  const payload = {
    title: qs("#propertyTitle").value,
    description: qs("#propertyDescription").value,
    type: qs("#propertyType").value,
    price: {
      rent: Number(qs("#propertyRent").value),
      deposit: Number(qs("#propertyDeposit").value || 0),
    },
    location: {
      county: qs("#propertyCounty").value,
      town: qs("#propertyCounty").value,
      area: qs("#propertyArea").value,
    },
    viewingType: qs("#propertyViewingType").value,
    bedrooms: 1,
    bathrooms: 1,
  };
  await apiRequest("/api/properties", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  event.target.reset();
  showToast("Property created");
  loadMyProperties();
};

const switchView = (view, options = {}) => {
  const requestedView = viewPaths[view] ? view : "discover";
  const role = storage.user?.role;
  const nextView = canAccessView(role, requestedView) ? requestedView : getDefaultViewForRole(role);
  const { pushState = true } = options;

  if (typeof window !== "undefined") {
    const nextPath = getViewPath(nextView);

    if (pushState && window.location.pathname !== nextPath) {
      window.history.pushState({ view: nextView }, "", nextPath);
    } else if (!pushState && requestedView !== nextView && window.location.pathname !== nextPath) {
      window.history.replaceState({ view: nextView }, "", nextPath);
    }
  }

  state.currentView = nextView;
  qsa(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === nextView));
  qsa(".view").forEach((section) => section.classList.toggle("active-view", section.id === `${nextView}View`));

  if (!storage.token) {
    return;
  }

  if (nextView === "saved") {
    loadFavorites().catch((error) => showToast(error.message));
  }

  if (nextView === "owner") {
    loadMyProperties().catch((error) => showToast(error.message));
    loadOwnerReviews().catch((error) => showToast(error.message));
  }

  if (nextView === "admin") {
    loadUsers().catch((error) => showToast(error.message));
    loadAdminReviews().catch((error) => showToast(error.message));
  }
};

const bindEvents = () => {
  if (qs("#baseUrl")) {
    qs("#baseUrl").value = storage.baseUrl;
    qs("#baseUrl").addEventListener("change", (event) => {
      storage.baseUrl = event.target.value;
      event.target.value = storage.baseUrl;
      setApiStatus("unknown", "Check API");
    });
  }
  qs("#themeToggle").addEventListener("click", () => {
    storage.theme = nextTheme(storage.theme);
    applyTheme(storage.theme);
  });
  qs("#colorModeControl").addEventListener("change", (event) => {
    if (event.target.name !== "colorMode") {
      return;
    }

    storage.colorMode = event.target.value;
    applyColorMode(storage.colorMode);
  });
  qs("#healthButton")?.addEventListener("click", () => {
    apiRequest("/api/health")
      .then((body) => showToast(`API ${body.status}; database ${body.database.status}`))
      .catch((error) => showToast(error.message));
  });
  qs("#signInButton").addEventListener("click", () => signInWithSelectedRole().catch((error) => showToast(error.message)));
  qs("#signUpButton").addEventListener("click", () => openSignUpDialog());
  qs("#enterAppButton").addEventListener("click", (event) => {
    event.stopPropagation();
    enterApp();
  });
  qs("#landingPage").addEventListener("click", () => enterApp());
  window.addEventListener("keydown", (event) => {
    if (qs("#landingPage").hidden || !["Enter", " "].includes(event.key)) {
      return;
    }

    event.preventDefault();
    enterApp();
  });
  qs("#logoutButton").addEventListener("click", async () => {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: storage.refreshToken }),
      });
    } catch {
      // Clearing local state is still correct if the server token was already gone.
    }
    clearSession();
    renderMetrics(null);
    switchView("discover");
    loadProperties().catch((error) => showToast(error.message));
    showToast("Logged out");
  });
  qs("#filterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadProperties().catch((error) => showToast(error.message));
  });
  qs("#clearFilters").addEventListener("click", () => {
    qs("#filterForm").reset();
    loadProperties().catch((error) => showToast(error.message));
  });
  qs("#refreshProperties").addEventListener("click", () => loadProperties().catch((error) => showToast(error.message)));
  qs("#sortProperties").addEventListener("change", (event) => {
    state.propertySort = event.target.value;
    renderProperties();
  });
  qs("#refreshDashboard").addEventListener("click", () => loadDashboard().catch((error) => showToast(error.message)));
  qs("#refreshFavorites").addEventListener("click", () => loadFavorites().catch((error) => showToast(error.message)));
  qs("#refreshMine").addEventListener("click", () => loadMyProperties().catch((error) => showToast(error.message)));
  qs("#refreshOwnerReviews").addEventListener("click", () => loadOwnerReviews().catch((error) => showToast(error.message)));
  qs("#refreshUsers").addEventListener("click", () => loadUsers().catch((error) => showToast(error.message)));
  qs("#refreshAdminReviews").addEventListener("click", () => loadAdminReviews().catch((error) => showToast(error.message)));
  qs("#propertyForm").addEventListener("submit", (event) => createProperty(event).catch((error) => showToast(error.message)));
  qs("#properties").addEventListener("click", bindPropertyActions);
  qs("#favorites").addEventListener("click", bindPropertyActions);
  qs("#myProperties").addEventListener("click", bindPropertyActions);
  qs("#ownerReviews").addEventListener("click", bindReviewActions);
  qs("#adminUsers").addEventListener("change", (event) => {
    const userId = event.target.dataset.userStatus;

    if (!userId || !event.target.value) {
      return;
    }

    apiRequest(`/api/admin/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({
        status: event.target.value,
        reason: "Updated from KejaApp web dashboard",
      }),
    })
      .then(() => {
        showToast("User status updated");
        loadUsers();
      })
      .catch((error) => showToast(error.message));
  });
  qsa(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });
  window.addEventListener("popstate", () => {
    renderAuthGate();
    switchView(resolveViewFromPath(window.location.pathname), { pushState: false });
  });
};

const init = () => {
  applyTheme();
  applyColorMode();
  renderSession();
  renderRoleAccess();
  renderAuthGate();
  bindEvents();
  switchView(resolveViewFromPath(window.location.pathname), { pushState: false });
  setApiStatus("unknown", "Checking API");
  apiRequest("/api/health")
    .then((body) => setApiStatus(body.database?.status === "connected" ? "online" : "degraded", body.database?.status || "API online"))
    .catch((error) => showToast(error.message));

  if (!shouldShowSplash({ isSignedIn: Boolean(storage.user && storage.token), path: window.location.pathname }) && canSearchListings(storage.user?.role)) {
    loadProperties().catch((error) => showToast(error.message));
  }

  if (storage.token) {
    loadDashboard().catch((error) => showToast(error.message));
  }
};

if (typeof document !== "undefined") {
  init();
}
