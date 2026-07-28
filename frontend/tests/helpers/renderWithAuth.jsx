import { render } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext.jsx";

// Every page under src/pages now reads signedIn/currentUser/openAuthPanel
// from AuthContext instead of receiving them as props (see App.jsx) - render
// tests for those pages need this wrapper instead of passing those as props
// directly to the component under test.
export const renderWithAuth = (
  ui,
  { signedIn = false, currentUser = null, openAuthPanel = () => {}, setCurrentUser = () => {} } = {}
) =>
  render(
    <AuthProvider signedIn={signedIn} currentUser={currentUser} openAuthPanel={openAuthPanel} setCurrentUser={setCurrentUser}>
      {ui}
    </AuthProvider>
  );
