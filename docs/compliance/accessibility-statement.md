# JakezApp Accessibility Statement

## 1. Commitment

JakezApp aims to be usable by as many people as possible, including people using assistive technology, people with low vision or motor impairments, and people on lower-powered devices or slower connections common across Kenya. This statement describes what's implemented today and what isn't yet, in the interest of honest self-disclosure rather than an unverified compliance claim.

## 2. Target standard

JakezApp is built with the **Web Content Accessibility Guidelines (WCAG) 2.1, Level AA** as its reference target — the standard most commonly referenced internationally and the one ISO/IEC 40500 formally adopts as an ISO standard. JakezApp has not undergone a formal WCAG conformance audit; this statement reflects a self-assessment against that target, not a certified conformance claim.

## 3. What's implemented today

- **Touch targets**: interactive controls (buttons, tabs, form fields) target a minimum 44px touch area on both web and mobile, following a dedicated UI/UX pass to fix undersized controls.
- **Reduced motion**: skeleton loading placeholders and other animated UI respect the `prefers-reduced-motion` media query (`frontend/styles.css`), falling back to a static state instead of a pulsing animation for users who've requested it at the OS level.
- **Keyboard accessibility**: the admin user-management table is keyboard-navigable, not mouse-only. The sign-in/sign-up dialog follows the standard modal pattern (`role="dialog"`, `aria-modal`, focus moves to its first field on open, Tab/Shift+Tab is trapped inside it, Escape closes it). The main web navigation bar follows the ARIA tablist pattern (`role="tab"`/`aria-selected`, roving `tabindex`, and Left/Right/Home/End arrow-key navigation between tabs).
- **Image alt text**: property images support owner-provided alt text, surfaced to screen readers. If an image fails to load, a dedicated placeholder (icon + "Photo unavailable" label, still carrying the alt text) replaces it, rather than the browser's bare broken-image icon.
- **Color contrast**: the app uses a single, fixed Kenyan-flag-derived color palette with an explicit light/dark mode toggle. A live UI/UX appraisal found a real gap in this - dark mode re-themed the neutral surface/text variables but not the four accent colors (`--green`/`--red`/`--amber`/`--teal`), so text styled directly with them (button labels, prices, ratings) rendered at ~1.4:1 contrast against the dark background, well under the 4.5:1 WCAG AA threshold for normal text. Fixed with dark-mode-specific values for all four, measured at 5.4–11.7:1 against both the dark background and card surface.
- **Responsive layout**: the web frontend adapts from desktop to phone-width layouts without horizontal scrolling or overlapping controls, and `KeyboardAvoidingView` is used on mobile forms so the on-screen keyboard doesn't obscure input fields.
- **Error/empty states**: pages that could previously dead-end silently on failure now show a visible error state with a retry action, rather than leaving a screen reader user on an unexplained blank screen.
- **Loading-state announcements**: every loading skeleton across the app uses `role="status"` with a descriptive `aria-label`, and `aria-hidden` is applied only to the decorative placeholder shapes inside it, not the status region itself - a general health-check pass found 11 spots where `aria-hidden` had been placed on the same element as `role="status"`, which silently removed the loading announcement from the accessibility tree entirely; all 11 now follow the pattern the property-listing skeleton already used correctly.

## 4. Known gaps

- No dedicated screen-reader pass (VoiceOver/TalkBack) has been performed across every screen — the items above address specific fixed issues, not a full audit.
- No formal automated accessibility testing (e.g. axe-core) is wired into CI yet.
- Some third-party form controls (native date pickers, native `<select>` elements) inherit whatever accessibility behavior the browser/OS provides, which hasn't been independently verified against WCAG 2.1 AA success criteria.
- Color contrast has not been checked against every text/background combination with an automated contrast-ratio tool — the dark-mode accent-color gap above was found via manual live inspection (a screenshot that looked wrong, then measured), not a systematic sweep, so other unchecked combinations may still have issues.

## 5. Feedback

If you encounter an accessibility barrier using JakezApp, please tell us via the in-app Feedback tab, or email `privacy@jakezapp.com` if you'd rather not use the app to report it. Include the page/screen, what assistive technology (if any) you were using, and what you expected to happen.

## 6. Review

This statement should be revisited whenever a UI/UX pass touches accessibility-relevant behavior, and reviewed at least annually otherwise. Maintained in `docs/accessibility-statement.md`.
