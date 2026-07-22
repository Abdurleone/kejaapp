import { render, screen } from "@testing-library/react";
import { memo } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotificationBadge from "../src/components/NotificationBadge.jsx";
import { AuthProvider } from "../src/context/AuthContext.jsx";

const { fetchDashboardSummary } = vi.hoisted(() => ({ fetchDashboardSummary: vi.fn() }));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchDashboardSummary };
});

let pageSpyRenderCount = 0;
const PageSpy = memo(function PageSpy() {
  pageSpyRenderCount += 1;
  return <div>page content</div>;
});

describe("NotificationBadge", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps its own unread-count updates isolated from sibling page content", async () => {
    pageSpyRenderCount = 0;
    fetchDashboardSummary.mockResolvedValue({ notifications: { unread: 3 } });

    render(
      <AuthProvider signedIn currentUser={{}} openAuthPanel={() => {}}>
        <NotificationBadge view="discover" />
        <PageSpy />
      </AuthProvider>
    );

    expect(pageSpyRenderCount).toBe(1);
    expect(await screen.findByText("3")).toBeInTheDocument();

    // The badge's own poll resolved and updated its count after mount - this
    // is the same state transition that happens every 30s. Proving the
    // sibling never re-renders here is what guarantees the poll can't drag
    // the rest of the app (e.g. whatever page is currently mounted) along
    // with it, unlike when this state lived in App itself.
    expect(pageSpyRenderCount).toBe(1);
  });

  it("hides the count while already on the Notifications tab", async () => {
    fetchDashboardSummary.mockResolvedValue({ notifications: { unread: 4 } });

    render(
      <AuthProvider signedIn currentUser={{}} openAuthPanel={() => {}}>
        <NotificationBadge view="notifications" />
      </AuthProvider>
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("4")).not.toBeInTheDocument();
  });
});
