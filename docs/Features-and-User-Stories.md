# Features and User Stories

## Core features

- Map-based and location-first property discovery.
- Account profile and password management.
- Property listings for landlords and agencies, with a full draft/available/taken/archived lifecycle.
- Property image galleries, uploaded to local disk or an S3-compatible bucket.
- Saved properties for tenants.
- Advanced property search and filters, including radius-based "near me" search.
- Transparent rent, deposit, and agency fee calculations.
- Property inquiries between tenants and property owners.
- Viewing request flow (scheduled or open viewings) between tenants and property owners.
- Reviews and rating aggregation.
- Agency verification workflow, with admin approval/rejection.
- A real notification inbox (web and mobile), plus proactive/scheduled nudges: stale inquiry/viewing-request reminders, upcoming-viewing reminders, post-viewing review prompts, and stale-listing nudges — delivered in-app, as mobile push notifications (Expo), and as browser push notifications on web (Web Push/VAPID).
- Saved location + radius searches for tenants, with an alert when a new listing matches one.
- Movers are full accounts (a `mover` role), going through the same admin verification workflow as agencies. Landlords/agencies can mark specific movers as trusted affiliates; tenants see a property's affiliated movers plus general movers within a radius of it, and can send a service request directly to a mover, who can accept, decline, or complete it — and now sees a pickup-to-dropoff distance for each request, computed from the tenant's device location at request time against the destination property's coordinates. Requests also carry a required home-size category (Studio/1BR/2BR/3BR/4BR+); when sent from a property page (drop-off already known), the tenant sees a price estimate weighing distance against home size — whichever is smaller (below a 10km threshold) plays a reduced role while the other dominates, on top of the mover's base price.
- A "Verified agency" badge shown wherever a listing's owner is displayed (Discover cards, property detail), driven by the same admin-approval decision as agency verification.
- Role-scoped property visibility: only tenants (and anonymous visitors) browse the general Discover list; landlords/agencies see and manage only their own listings everywhere, including full property detail pages; movers don't see property listings at all, only their service requests.
- A notification bell (web nav, mobile bottom tab) showing the unread count, which clears the moment you open Notifications. Actionable notifications (a mover request for the addressed mover, a viewing/inquiry for the addressed property owner) also open straight into the relevant screen with that request highlighted, ready to act on.
- Property owners can approve/reject viewing requests directly from a "Viewing requests" panel/segment on the Workspace tab (web and mobile), across all of their properties in one place — previously only possible via a raw API call despite the backend supporting it from the start.
- Platform feedback from tenants, landlords, agencies, and movers, with admin responses published as public testimonials on the landing page.
- Sign in with either your email or a username you choose at registration.

Each of these is backed by real acceptance criteria below, written from the perspective of the role that uses it.

---

### Account Management

As a user, I want to manage my profile and password, so that my account information stays current and secure.

- Given I am logged in, when I update my name or phone number, then my profile is saved.
- Given I try to update protected fields like email or role through the profile endpoint, then those fields are ignored.
- Given I change my password with the correct current password, then the new password is saved securely.
- Given I change my password with the wrong current password, then the API rejects the request.
- Given I want to delete my account (web: type DELETE to confirm; mobile: the same confirmation text plus a native confirm dialog), then my profile, sessions, saved homes, notifications, inquiries, viewing requests, reviews, agency/mover verification records, and any listings I own are all removed in one cascade.

### Role-Aware Dashboard

As a signed-in user of any role, I want a dashboard summary tailored to what I actually do on KejaApp, so that I see relevant counts instead of a generic, one-size-fits-all view.

- Given I am signed in as any role, when I load my dashboard summary, then I see my unread notification count.
- Given I am signed in as a tenant, then I additionally see my saved-properties count, my inquiries grouped by status, and my viewing requests grouped by status — I do not see owner, agency, or admin data.
- Given I am signed in as a landlord or agency, then I additionally see my own properties grouped by lifecycle status, plus incoming inquiries and viewing requests for my properties, each grouped by status.
- Given I am signed in as an agency, then I additionally see my agency verification status and rejection reason (if rejected) — landlords and tenants never see agency verification data.
- Given I am signed in as an admin, then I additionally see platform-wide agency verification counts and user violation counts by status — I do not see an owner listings section, since admins do not manage listings.

### Tenant Property Discovery

As a visitor or tenant, I want to browse and filter available rental properties by location, price, and property type, so that I can quickly find homes that match my needs and budget.

- Given I am on the property list, when I filter by rent, location, type, or availability, then I only see matching properties.
- Given I browse listings without a status filter, then I only see properties marked as available.
- Given I search near a latitude and longitude with a radius, then I only see properties with coordinates inside that area.
- Given I am signed in as a tenant, when I open a property, then I can view title, description, location, images, amenities, owner/agency type, listing contact details, reviews, and pricing.
- Given I am not signed in, when I try to open a property's full details, then I am prompted to sign in instead — the Discover list itself stays visible either way.
- Given I am signed in as a landlord or agency, when I open a property's full details, then I can only see one of my own listings this way — another owner's listing shows a "manage your own listings from the Workspace tab" message instead, even if I have a direct link to it.
- Given I am signed in as a mover, when I try to open any property's full details, then I'm told movers work from service requests and notifications, not individual listings — this applies to every listing, not just other owners'.
- Given I am signed in as a landlord, agency, or admin looking at my own accessible listing, then I don't see any "sign in as a tenant"-style message — only anonymous visitors are prompted to sign in.
- Given a property has rent, deposit, or agency fees, then I can see the total upfront cost and recurring monthly cost.
- Given I am signed in as a tenant, then I cannot access the owner listing creation tools.
- Given I am not signed in, when I try to save a listing, then the frontend prompts me to sign in or sign up.

### Property Lifecycle

As a landlord or agency, I want to mark a property as draft, available, taken, or archived, so that tenants only see listings that are actually open.

- Given I create a property without a status, then it defaults to available.
- Given I mark a property as taken, draft, or archived, then it is hidden from the default public property list.
- Given a property is not available, when a tenant requests a viewing, then the API rejects the viewing request.
- Given older clients send `isAvailable=false`, then the API maps that listing to taken for compatibility.

### Owner Property Management

As a landlord or agency, I want to view all my listings including draft, taken, and archived properties, so that I can manage my inventory without exposing inactive homes to tenants.

- Given I am authenticated as a landlord or agency, when I open my properties, then I can see my own listings across all statuses.
- Given I filter my properties by status, then I only see my own listings matching that lifecycle state.
- Given I am not authenticated, when I request my properties, then the API rejects the request.

### Admin User Management

As an admin, I want to search, review, and change the status of user accounts, so that I can moderate the platform's users without needing any access to listings.

- Given I am authenticated as an admin, when I list users, then I can search by name, email, or phone and filter by role.
- Given I open a user's account, then I can see their profile, violation counts, role-specific activity counts, and their full account status change history.
- Given I change a user's account status to active, suspended, or banned with a reason, then the account is updated, the change is logged for audit, and the user receives a notification.
- Given I try to change my own account status to suspended or banned, then the API rejects the request.
- Given I am not an admin, when I try to list users or change a user's account status, then the API rejects the request.
- Given I am an admin, when I try to create, edit, delete, or view listings, or manage inquiries or viewing requests for any property, then the API rejects the request — admins have no listing-management capability anywhere in the API.

### Transparent Pricing

As a landlord or agency, I want to add rent, deposit, and agency fee values to my property listings, so that tenants can understand the full cost before contacting me.

- Given I am logged in as a landlord or agency, when I create or update a property, then I can save valid pricing fields.
- Given I am not authenticated, or I have a tenant or admin role, then the API rejects the request to create/update pricing.
- Given I am any user, when I submit price values to the cost calculator, then I receive first-month, upfront, and recurring monthly totals without creating or changing a property.

### Listing Contact Details

As a landlord or agency, I want to define the best contact method and available contact hours on each listing, so that tenants know how to reach me without KejaApp handling payments or private negotiations.

- Given I am authenticated as a landlord or agency, when I create or update a property, then I can add a preferred contact method, phone, email, WhatsApp number, contact hours, and notes.
- Given a tenant views a property, when contact details are present, then they can read but not edit them.
- Given contact details include a phone, email, or WhatsApp number, when a tenant taps one, then the app opens the device's dialer, mail client, or WhatsApp directly (a "Contact via {method}" shortcut is also shown for the owner's preferred method).
- Given I submit invalid contact details, then the API rejects unsupported contact methods and invalid emails.

### Property Image Management

As a landlord or agency, I want to add and remove images for my property listings, so that tenants can inspect the home before requesting a viewing.

- Given I am the property/agency owner, when I add a valid image URL and optional alt text, then the image appears on the property.
- Given I am not authorized to manage the property, then the API rejects the request to add/remove an image.
- Given I remove an existing image, then it no longer appears on the property.
- Given I add image alt text, then it's available for accessibility and context.

### Saved Properties

As a tenant, I want to save properties I like, so that I can compare and revisit them later.

- Given I am logged in, when I save a property, then it appears in my saved properties list.
- Given I already saved a property, when I try to save it again, then the API rejects the duplicate.
- Given I remove a saved property, then it no longer appears when I view my saved list.
- Given I list my saved properties, then each includes its pricing and cost summary.

### Property Reviews

As a tenant, I want to review a property after interacting with it, so that future tenants can make more informed decisions.

- Given I submit a valid rating and comment for a property I do not own, then the review is saved.
- Given a property has reviews, then I can see the review list and aggregated rating.
- Given I am the landlord/agency that owns the reviewed property, when I respond, then my response is attached to the review.
- Given I am any role, then I cannot delete a review or rating.
- Given I am an admin, when I open review moderation, then I can see reviews and ratings in read-only mode.
- Given a new review is created, when the property owner has an account, then they receive a notification.

### Property Inquiries

As a tenant, I want to send an inquiry about a property, so that I can ask questions before requesting a viewing or contacting the owner directly.

- Given I am logged in and the property exists, when I submit a message and optional contact preference, then an open inquiry is created.
- Given I own the property, when a tenant sends an inquiry, then I receive a notification.
- Given I respond to an inquiry, then the tenant receives a notification.
- Given I list my inquiries, then I only see inquiries I sent.
- Given I own a property, when I list property inquiries, then I only see inquiry records for that property.
- Given I am a landlord or agency, when I list received inquiries, then I see inquiries across all of my properties in one call, scoped server-side by owner. Admins cannot view or respond to inquiries for any property.

### Viewing Requests

As a tenant, I want to request a viewing for a property, so that I can arrange a visit before deciding whether to rent it.

- Given a landlord or agency creates a property, when they choose a viewing type, then the listing can be marked `scheduled` or `open`.
- Given the property has scheduled viewing, when I submit a future requested date and optional message, then a pending viewing request is created.
- Given the property has open viewing, when I submit an optional message without a requested date, then an approved viewing request is created.
- Given I own the property, when a tenant requests a viewing, then I receive a notification.
- Given I already have a pending or approved request for the same property, then a new request is rejected as a duplicate.
- Given I am the property owner, when I approve/reject/cancel/complete a viewing request, then the requester receives a notification. Admins cannot view or manage viewing requests for any property.
- Given I am a landlord or agency, when I open the "Viewing requests" panel/segment on the Workspace tab, then I see incoming viewing requests across all of my properties in one place and can approve or reject each directly.

### Agency Verification

As an agency, I want to submit business verification details, so that tenants can trust that my listings are legitimate.

- Given I am logged in as an agency, when I submit valid verification details and documents, then my verification request is saved for admin review.
- Given I already have a pending or approved verification, then a new submission is prevented as a duplicate active request.
- Given an admin approves or rejects my request, then I can see the latest decision and reason if rejected.
- Given my verification is approved, when a tenant views one of my listings, then they see a "Verified agency" badge next to my name; given I'm not yet verified (or I'm a landlord), no badge appears and my listings work exactly the same otherwise.

### Admin Moderation

As an admin, I want to review agency and mover verification requests, so that only trusted businesses are marked as verified.

- Given I list agency or mover verification requests, then I can view pending, approved, and rejected requests for each.
- Given I approve a request, then the agency/mover is marked approved and receives a notification.
- Given I reject a request with a reason, then the agency/mover is marked rejected and receives the reason in a notification.

### Notifications

As a user, I want to receive notifications for important account and listing activity — both things that just happened and things I might otherwise miss — so that I do not miss updates that need my attention.

- Given I am logged in, when I request my notifications, then I only see notifications that belong to me, with a real inbox to browse them (web: a `Notifications` tab; mobile: a `Notifications` bottom tab), not just an unread count.
- Given I mark a notification as read, then it no longer appears as unread, and this persists across reloads/app restarts.
- Given I only want to see what's new, when I toggle "Unread only" (web) / the "Unread" filter (mobile), then read notifications are hidden.
- Given I have unread notifications, then a bell badge on the Notifications tab (web nav, mobile bottom tab) shows the unread count, refreshed roughly every 30 seconds.
- Given I open the Notifications tab, then the bell badge clears immediately and every notification is marked read in the background — I don't have to mark each one individually for the badge to go away.
- Given a relevant event happens directly (agency verification, a property review, an inquiry/viewing request/response, a feedback response), then a notification is created immediately.
- Given a landlord or agency hasn't responded to an inquiry or viewing request within 48 hours, when the scheduled sweep runs, then they get a one-time nudge (no repeat nudges for the same item).
- Given an approved viewing is happening within the next 24 hours, when the scheduled sweep runs, then both the tenant and the owner get a one-time reminder.
- Given an approved viewing's date has passed, when the scheduled sweep runs, then the viewing is marked `completed` and the tenant gets a one-time prompt to leave a review — unless they already reviewed that property, in which case the viewing is still marked completed but no prompt is sent.
- Given a listing has been available for 14+ days with zero inquiries, when the scheduled sweep runs, then its owner gets a one-time nudge to refresh photos or price.
- Given I've registered a mobile device and I'm signed in, when any of the above create a notification for me, then I also receive it as a push notification (best-effort — a failed push never blocks the underlying action).
- Given I've enabled browser notifications on web (Account page toggle) and I'm signed in, when any of the above create a notification for me, then I also receive it as a browser push notification — independent of mobile push, so one channel failing never blocks the other.
- Given a notification is about a mover request addressed to me (as the mover) or a viewing/inquiry addressed to me (as the property owner), when I open it, then I'm taken straight to the Movers or Workspace tab with that specific request highlighted, ready to act on, and the notification is marked read as a side effect. Given it isn't something I can act on, opening it stays read-only.

### Saved Searches

As a tenant, I want to save a Discover search (location + radius today), so that I'm notified when a new listing matches it instead of having to keep re-checking manually.

- Given I've set a location and radius on Discover, when I save the search, then it appears in my saved searches (Account page on web, Account tab on mobile).
- Given I have a saved search, when a landlord/agency publishes a new listing matching it, then I get a notification (and a push notification, if I have a mobile device registered or browser notifications enabled).
- Given I no longer want a saved search, when I remove it, then it stops matching future listings.
- Given I am not signed in, when I try to save a search, then I'm prompted to sign in first.

### Mover Discovery

As a tenant, I want to browse mover and relocation services, so that I can plan my move after finding a home.

- Given I view movers, when I filter by service type, county, or rating, then I only see matching mover providers.
- Given movers are returned, then I can see provider details, service areas, rating, verification status, and base price.
- Given I open a property's detail page, when it has an owner-affiliated mover or verified movers within its proximity radius, then I see them grouped as "Recommended by the owner" and "Movers nearby" without duplicates.

### Mover Accounts, Affiliates, and Service Requests

As a moving company, I want to create an account, get verified, and hear from tenants who need my services, so that I can run my business through the platform instead of just being listed in it.

- Given I register with the `mover` role, when I submit my business profile, then it's saved to my account and immediately visible in the public mover directory, whether or not I'm verified yet.
- Given I submit verification details as a mover, the workflow matches agency verification exactly: pending until reviewed, approved/rejected with a reason, and a notification either way — my listing keeps working the whole time, verification only adds a badge.
- Given I am a landlord or agency, when I mark a mover as an affiliate (or remove one), then that mover shows up (or stops showing up) under "Recommended by the owner" on my properties' detail pages.
- Given I am a tenant, when I send a service request to a mover (optionally from a property page), then the mover receives it as pending. I must choose a home-size category (Studio/1BR/2BR/3BR/4BR+); if the request is tied to a property (drop-off already known), I also see a price estimate weighing distance against home size — whichever is smaller, below a fixed threshold, plays a reduced role while the other dominates, on top of the mover's base price.
- Given I am the mover who received a request, when I accept, decline, or complete it (optionally with a response), then the tenant is notified. Given I am the tenant, I can also cancel my own pending request.
- Given I am a tenant sending a request and I grant location access, then the mover sees an estimated pickup-to-dropoff distance on that request, computed against the destination property's coordinates. Given I decline location access (or it's unavailable), then the request still sends fine, it just shows no distance.
- Given I am a mover, when I check my Dashboard, then I see my verification status and a breakdown of received requests by status.

### Platform Feedback

As a tenant, landlord, agency, or mover, I want to tell KejaApp how the platform helped me, and have an admin respond, so that my experience can be shared as a testimonial for future users.

- Given I am a signed-in tenant, landlord, agency, or mover, when I submit feedback, then it is saved as pending and I can see it in my own feedback list.
- Given I am an admin, when I try to submit feedback, then the API rejects the request — admins only respond, they don't submit.
- Given I am an admin, when I list all feedback, then I can see every submission regardless of who sent it.
- Given I respond to a pending item, then it becomes `responded`, the submitter is notified, and it becomes publicly visible as a testimonial.
- Given feedback has not yet received an admin response, then it does not appear in the public testimonial list.
- Given I am a signed-out visitor, when I load the landing page, then I see published testimonials, if any exist, with no sign-in required.

### Username Login

As a user who would rather not type my email at login, I want to choose my own username at registration, so that I can sign in without exposing my email on the login screen.

- Given I register a new account, when I choose a username that's available, then my account is created with that username, shown to me right away and visible afterward on my Account page.
- Given I choose a username that's already taken, then registration is rejected with a clear error and a few available alternatives I can pick from instead.
- Given I sign in with either my email or my chosen username plus my correct password, then I am logged in.
- Given I sign in with the correct identifier but the wrong password, then the API rejects the request with a generic invalid-credentials message that doesn't reveal which part was wrong.
- Given my account was created before this feature existed, then a one-off backfill assigns me an auto-generated username the next time it runs, without requiring me to do anything.

See **[Authentication](Authentication)** for the technical details of how this works.
