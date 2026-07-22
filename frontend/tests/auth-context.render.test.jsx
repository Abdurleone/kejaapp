import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AuthProvider, useAuth } from "../src/context/AuthContext.jsx";

let capturedValues;

const Consumer = () => {
  const value = useAuth();
  capturedValues.push(value);
  return null;
};

const Harness = ({ signedIn, currentUser, openAuthPanel }) => {
  const [tick, setTick] = useState(0);

  return (
    <AuthProvider signedIn={signedIn} currentUser={currentUser} openAuthPanel={openAuthPanel}>
      <Consumer />
      <button type="button" onClick={() => setTick((current) => current + 1)}>
        tick {tick}
      </button>
    </AuthProvider>
  );
};

describe("AuthContext", () => {
  it("keeps the same context value reference across a re-render triggered by unrelated state", async () => {
    capturedValues = [];
    const user = userEvent.setup();

    render(<Harness signedIn={false} currentUser={null} openAuthPanel={() => {}} />);
    expect(capturedValues).toHaveLength(1);

    await user.click(screen.getByRole("button"));

    expect(capturedValues).toHaveLength(2);
    expect(capturedValues[1]).toBe(capturedValues[0]);
  });

  it("produces a new context value when signedIn/currentUser actually change", () => {
    capturedValues = [];
    const openAuthPanel = () => {};

    const { rerender } = render(
      <AuthProvider signedIn={false} currentUser={null} openAuthPanel={openAuthPanel}>
        <Consumer />
      </AuthProvider>
    );

    rerender(
      <AuthProvider signedIn currentUser={{ name: "Demo Tenant" }} openAuthPanel={openAuthPanel}>
        <Consumer />
      </AuthProvider>
    );

    expect(capturedValues).toHaveLength(2);
    expect(capturedValues[1]).not.toBe(capturedValues[0]);
    expect(capturedValues[1].signedIn).toBe(true);
  });
});
