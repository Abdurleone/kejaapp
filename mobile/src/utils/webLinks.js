import { Linking } from "react-native";

// Matches render.yaml's kejaapp-backend service - the web app and its API
// have shared one Render origin since the consolidation (kejaapp-frontend
// was retired, not renamed - see CHANGELOG.md's "Consolidate Web + API onto
// One Render Origin" entry). Update this if you deploy under a different
// Render service name or a custom domain.
export const webAppBaseUrl = "https://kejaapp-backend-7iu3.onrender.com";

// Terms/Privacy content lives only on the web app (frontend/src/pages/
// TermsPage.jsx, DataProtectionPage.jsx) - mobile links out rather than
// duplicating that content natively, so it can't drift out of sync.
export const openLegalPage = (path) => {
  Linking.openURL(`${webAppBaseUrl}${path}`).catch(() => {});
};
