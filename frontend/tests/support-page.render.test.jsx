import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SupportPage from "../src/pages/SupportPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const { initiateSupportPayment, fetchSupportPaymentStatus } = vi.hoisted(() => ({
  initiateSupportPayment: vi.fn(),
  fetchSupportPaymentStatus: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, initiateSupportPayment, fetchSupportPaymentStatus };
});

describe("SupportPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("submits a support payment and shows the pending state", async () => {
    initiateSupportPayment.mockResolvedValue({ _id: "pay-1", status: "pending", checkoutRequestId: "checkout-1" });
    fetchSupportPaymentStatus.mockResolvedValue({ _id: "pay-1", status: "pending" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithAuth(<SupportPage />, { signedIn: true, currentUser: { role: "tenant", phone: "0712345678" } });

    await user.clear(screen.getByLabelText("Amount (KES)"));
    await user.type(screen.getByLabelText("Amount (KES)"), "100");
    await user.click(screen.getByRole("button", { name: "Pay via M-Pesa" }));

    expect(initiateSupportPayment).toHaveBeenCalledWith({ phoneNumber: "0712345678", amount: 100 });
    expect(await screen.findByText("Check your phone and enter your M-Pesa PIN to complete the payment.")).toBeInTheDocument();
  });

  it("pre-fills the phone number from the signed-in user's profile", () => {
    renderWithAuth(<SupportPage />, { signedIn: true, currentUser: { role: "tenant", phone: "0798765432" } });

    expect(screen.getByLabelText("M-Pesa phone number")).toHaveValue("0798765432");
  });

  it("shows a success message once polling reports completed", async () => {
    initiateSupportPayment.mockResolvedValue({ _id: "pay-1", status: "pending", checkoutRequestId: "checkout-1" });
    fetchSupportPaymentStatus.mockResolvedValue({
      _id: "pay-1",
      status: "completed",
      mpesaReceiptNumber: "NLJ7RT61SV",
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithAuth(<SupportPage />, { signedIn: true, currentUser: { role: "tenant", phone: "0712345678" } });
    await user.click(screen.getByRole("button", { name: "Pay via M-Pesa" }));
    await screen.findByText("Check your phone and enter your M-Pesa PIN to complete the payment.");

    await vi.advanceTimersByTimeAsync(3000);

    expect(await screen.findByText("Thank you! Your support payment went through.")).toBeInTheDocument();
  });

  it("shows a cancelled message without treating it as a failure", async () => {
    initiateSupportPayment.mockResolvedValue({ _id: "pay-1", status: "pending", checkoutRequestId: "checkout-1" });
    fetchSupportPaymentStatus.mockResolvedValue({ _id: "pay-1", status: "cancelled" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithAuth(<SupportPage />, { signedIn: true, currentUser: { role: "tenant", phone: "0712345678" } });
    await user.click(screen.getByRole("button", { name: "Pay via M-Pesa" }));
    await screen.findByText("Check your phone and enter your M-Pesa PIN to complete the payment.");

    await vi.advanceTimersByTimeAsync(3000);

    expect(await screen.findByText("Payment cancelled - nothing was charged.")).toBeInTheDocument();
  });

  it("shows an error when initiation itself fails", async () => {
    initiateSupportPayment.mockRejectedValue(new Error("M-Pesa support payments are not configured"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithAuth(<SupportPage />, { signedIn: true, currentUser: { role: "tenant" } });
    await user.type(screen.getByLabelText("M-Pesa phone number"), "0712345678");
    await user.click(screen.getByRole("button", { name: "Pay via M-Pesa" }));

    expect(await screen.findByText("M-Pesa support payments are not configured")).toBeInTheDocument();
  });
});
