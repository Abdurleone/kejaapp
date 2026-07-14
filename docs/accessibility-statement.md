# KejaApp Accessibility Statement

## 1. Commitment

KejaApp aims to be usable by as many people as possible, including people using assistive technology, people with low vision or motor impairments, and people on lower-powered devices or slower connections common across Kenya. This statement describes what's implemented today and what isn't yet, in the interest of honest self-disclosure rather than an unverified compliance claim.

## 2. Target standard

KejaApp is built with the **Web Content Accessibility Guidelines (WCAG) 2.1, Level AA** as its reference target — the standard most commonly referenced internationally and the one ISO/IEC 40500 formally adopts as an ISO standard. KejaApp has not undergone a formal WCAG conformance audit; this statement reflects a self-assessment against that target, not a certified conformance claim.

## 3. What's implemented today

- **Touch targets**: interactive controls (buttons, tabs, form fields) target a minimum 44px touch area on both web and mobile, following a dedicated UI/UX pass to fix undersized controls.
- **Reduced motion**: skeleton loading placeholders and other animated UI respect the `prefers-reduced-motion` media query (`frontend/styles.css`), falling back to a static state instead of a pulsing animation for users who've requested it at the OS level.
- **Keyboard accessibility**: the admin user-management table is keyboard-navigable, not mouse-only. The sign-in/sign-up dialog follows the standard modal pattern (`role="dialog"`, `aria-modal`, focus moves to its first field on open, Tab/Shift+Tab is trapped inside it, Escape closes it). The main web navigation bar follows the ARIA tablist pattern (`role="tab"`/`aria-selected`, roving `tabindex`, and Left/Right/Home/End arrow-key navigation between tabs).
- **Image alt text**: property images support owner-provided alt text, surfaced to screen readers and shown as fallback context if an image fails to load.
- **Color contrast**: the app uses a single, fixed Kenyan-flag-derived color palette with an explicit light/dark mode toggle, chosen in part for consistent contrast rather than a large, harder-to-audit theme surface.
- **Responsive layout**: the web frontend adapts from desktop to phone-width layouts without horizontal scrolling or overlapping controls, and `KeyboardAvoidingView` is used on mobile forms so the on-screen keyboard doesn't obscure input fields.
- **Error/empty states**: pages that could previously dead-end silently on failure now show a visible error state with a retry action, rather than leaving a screen reader user on an unexplained blank screen.

## 4. Known gaps

- No dedicated screen-reader pass (VoiceOver/TalkBack) has been performed across every screen — the items above address specific fixed issues, not a full audit.
- No formal automated accessibility testing (e.g. axe-core) is wired into CI yet.
- Some third-party form controls (native date pickers, native `<select>` elements) inherit whatever accessibility behavior the browser/OS provides, which hasn't been independently verified against WCAG 2.1 AA success criteria.
- Color contrast has not been checked against every text/background combination with an automated contrast-ratio tool — the palette was chosen for visual consistency, not verified line-by-line.

## 5. Feedback

If you encounter an accessibility barrier using KejaApp, please tell us via the in-app Feedback tab, or email `privacy@kejaapp.com` if you'd rather not use the app to report it. Include the page/screen, what assistive technology (if any) you were using, and what you expected to happen.

## 6. Review

This statement should be revisited whenever a UI/UX pass touches accessibility-relevant behavior, and reviewed at least annually otherwise. Maintained in `docs/accessibility-statement.md`.
