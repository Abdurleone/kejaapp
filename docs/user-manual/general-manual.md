# KejaApp User Manual — General Guide

This is the starting point for using KejaApp, whatever role you sign up as. For workflows specific to your role, see:

- [Tenant Manual](tenant-manual.md)
- [Landlord & Agency Manual](landlord-agency-manual.md)
- [Mover Manual](mover-manual.md)
- [Admin Manual](admin-manual.md)

## 1. What KejaApp is

KejaApp is a location-first rental platform connecting tenants, landlords, agencies, and moving-service providers, with admin oversight for trust and safety. It does not process payments — rent, deposits, agency fees, and mover charges are agreed and paid directly between the parties involved (see [Payment Boundary](../../README.md#payment-boundary)).

## 2. Where to use it

- **Web**: any modern browser, at the address your KejaApp deployment is hosted on.
- **Mobile**: a React Native app for iOS and Android (via Expo). See [`mobile/README.md`](../../mobile/README.md) for installing/running it.

Both surfaces talk to the same backend and share the same account — sign in on either and your data (saved properties, notifications, requests) is the same.

## 3. Creating an account

1. Choose **Sign up** (web: header; mobile: the sign-in screen).
2. Provide your name, a real email address, a password, a phone number, and choose a **username** — an alternate way to sign in without typing your email each time.
   - If your chosen username is taken, you'll be offered up to 3 available alternatives to pick from instead.
3. Choose your role: **Tenant**, **Landlord**, **Agency**, or **Mover**. (Admin accounts are not self-registered — they're provisioned separately.)
4. Your role determines what you can do on KejaApp — see the role-specific manuals linked above. Role is fixed after registration; contact `privacy@kejaapp.com` if you registered under the wrong role.

Creating an account means you agree to the [Terms of Service](../terms-of-service.md) and [Acceptable Use Policy](../acceptable-use-policy.md).

## 4. Signing in

Enter either your **email or your username**, plus your password. For security, if either the identifier or the password is wrong, KejaApp shows the same generic "invalid credentials" message — it won't tell you which one was incorrect.

## 5. Features every signed-in user has

- **Dashboard** — your home screen after signing in, showing counts and status relevant to your role (unread notifications for everyone, plus role-specific sections).
- **Notifications** — a real inbox of everything that's happened on your account (inquiries, viewing/mover-request updates, verification decisions, feedback responses, and proactive reminders). A bell icon shows your unread count and clears the moment you open the tab.
- **Account** — update your name/phone, change your password, manage saved searches (tenants), and delete your account.
- **Feedback** — tell KejaApp how the platform is working for you. An admin response to your feedback is published as a public testimonial on the landing page.
- **Light/dark mode** — a toggle present on every screen, remembered across sessions.

## 6. Your data and privacy

See the [Data Protection Policy](../data-protection-policy.md) for what KejaApp collects and why, the [Cookie Policy](../cookie-policy.md) for cookies/local storage specifically, and the in-app "Privacy" page (linked from the footer) for a summary you can also download as a PDF. In short:

- KejaApp never sells your data.
- Your contact details are only shared with another user when needed to complete something you initiated (an inquiry, a viewing, a mover request).
- You can delete your account and its associated data at any time from the Account page (type `DELETE` to confirm), or by emailing `privacy@kejaapp.com` if you can't sign in.

## 7. Getting help

- **In-app**: the Feedback tab.
- **Data/privacy questions or rights requests**: `privacy@kejaapp.com` (see the [Data Protection Policy](../data-protection-policy.md#10-data-subject-rights)).
- **A dispute with another user, or an appeal of an account action**: see the [Dispute Resolution & Complaints Policy](../dispute-resolution-policy.md).
- **Security vulnerability reports**: see [SECURITY.md](../../SECURITY.md).
- **Accessibility barriers**: see the [Accessibility Statement](../accessibility-statement.md).

## 8. Troubleshooting

| Problem | What to check |
|---|---|
| Can't sign in | Confirm you're using the right email/username and password; if you recently changed your password, sign in with the new one |
| Not seeing a page/tab you expect | Some tabs are role-specific — check the manual for your role above |
| Notifications bell not clearing | It clears when you open the Notifications tab itself, not just the Dashboard's unread count preview |
| A listing/mover you saw before is gone | Owners can mark listings unavailable/archived; movers can update their own profile — this isn't a bug |
