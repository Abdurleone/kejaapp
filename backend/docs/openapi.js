const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "KejaApp API",
    version: "1.0.0",
    description: "Backend API for KejaApp property discovery, owner workflows, and moderation.",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local development",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["Health"],
        summary: "Get bare root health status",
        responses: {
          200: {
            description: "API is running",
          },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Get API health",
        responses: {
          200: {
            description: "API health status",
          },
        },
      },
    },
    "/api/health/database": {
      get: {
        tags: ["Health"],
        summary: "Actively ping MongoDB",
        responses: {
          200: {
            description: "Database is reachable",
          },
          503: {
            description: "Database is not reachable",
          },
        },
      },
    },
    "/api/health/live": {
      get: {
        tags: ["Health"],
        summary: "Load balancer liveness probe",
        responses: {
          200: {
            description: "Process is alive",
          },
        },
      },
    },
    "/api/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Load balancer readiness probe",
        responses: {
          200: {
            description: "Instance is ready for traffic",
          },
          503: {
            description: "Instance is not ready for traffic",
          },
        },
      },
    },
    "/api/docs/openapi.json": {
      get: {
        tags: ["Docs"],
        summary: "Get this OpenAPI spec as JSON",
        responses: {
          200: {
            description: "OpenAPI 3.1 document",
          },
        },
      },
    },
    "/api/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Get role-aware dashboard counts",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Dashboard summary",
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user",
        responses: {
          201: {
            description: "Registered user and access token",
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in a user",
        responses: {
          200: {
            description: "Authenticated user and access token",
          },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh an access token with a refresh session token",
        responses: {
          200: {
            description: "Rotated refresh session and new access token",
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out and clear the auth cookie",
        responses: {
          200: {
            description: "Logged out",
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user profile",
          },
        },
      },
      put: {
        tags: ["Auth"],
        summary: "Update the current user's name/phone",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Updated user profile",
          },
        },
      },
      delete: {
        tags: ["Auth"],
        summary: "Delete the current user's account and cascade all owned/related data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Account deleted",
          },
        },
      },
    },
    "/api/auth/password": {
      put: {
        tags: ["Auth"],
        summary: "Change the current user's password",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Password changed",
          },
        },
      },
    },
    "/api/properties": {
      get: {
        tags: ["Properties"],
        summary: "List public properties",
        responses: {
          200: {
            description: "Paginated property list",
          },
        },
      },
      post: {
        tags: ["Properties"],
        summary: "Create a property",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Created property",
          },
        },
      },
    },
    "/api/properties/costs/calculate": {
      post: {
        tags: ["Properties"],
        summary: "Calculate first-month, upfront, and recurring monthly costs",
        responses: {
          200: {
            description: "Cost summary",
          },
        },
      },
    },
    "/api/properties/mine": {
      get: {
        tags: ["Properties"],
        summary: "List the current owner's own properties across all statuses",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated owner property list",
          },
        },
      },
    },
    "/api/properties/{id}": {
      get: {
        tags: ["Properties"],
        summary: "Get a property by id",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Property detail",
          },
        },
      },
      put: {
        tags: ["Properties"],
        summary: "Update a property owned by the current landlord/agency",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Updated property",
          },
        },
      },
      delete: {
        tags: ["Properties"],
        summary: "Delete a property and cascade its dependent records",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Property deleted",
          },
        },
      },
    },
    "/api/properties/{id}/inquiries": {
      get: {
        tags: ["Properties"],
        summary: "List inquiries for one property (owner only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Inquiries for the property",
          },
        },
      },
    },
    "/api/properties/{id}/movers": {
      get: {
        tags: ["Properties"],
        summary: "List the property owner's affiliated movers plus verified movers nearby",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Deduplicated mover list",
          },
        },
      },
    },
    "/api/properties/{id}/reviews": {
      get: {
        tags: ["Properties"],
        summary: "List public reviews for a property",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Reviews and rating aggregation",
          },
        },
      },
    },
    "/api/properties/{id}/viewings": {
      get: {
        tags: ["Properties"],
        summary: "List viewing requests for one property (owner only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Viewing requests for the property",
          },
        },
      },
    },
    "/api/properties/{id}/images": {
      post: {
        tags: ["Properties"],
        summary: "Add a property image by URL",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          201: {
            description: "Added image",
          },
        },
      },
    },
    "/api/properties/{id}/images/upload": {
      post: {
        tags: ["Properties"],
        summary: "Upload a property image using base64 JSON payload storage",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          201: {
            description: "Uploaded image and fingerprint review result",
          },
        },
      },
    },
    "/api/properties/{id}/images/{imageId}": {
      delete: {
        tags: ["Properties"],
        summary: "Remove a property image",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
          {
            name: "imageId",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Image removed",
          },
        },
      },
    },
    "/api/favorites": {
      get: {
        tags: ["Favorites"],
        summary: "List the current tenant's saved properties",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated favorites list",
          },
        },
      },
    },
    "/api/favorites/{propertyId}": {
      post: {
        tags: ["Favorites"],
        summary: "Save a property",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "propertyId",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          201: {
            description: "Saved favorite",
          },
        },
      },
      delete: {
        tags: ["Favorites"],
        summary: "Remove a saved property",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "propertyId",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Favorite removed",
          },
        },
      },
    },
    "/api/reviews": {
      post: {
        tags: ["Reviews"],
        summary: "Create a tenant review and rating for a property",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Created review",
          },
        },
      },
    },
    "/api/reviews/mine": {
      get: {
        tags: ["Reviews"],
        summary: "List reviews for properties managed by the current owner",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Reviews for owned properties",
          },
        },
      },
    },
    "/api/reviews/{id}/response": {
      put: {
        tags: ["Reviews"],
        summary: "Respond to a review as the landlord or agency that owns the property",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Updated review response",
          },
        },
      },
    },
    "/api/inquiries": {
      get: {
        tags: ["Inquiries"],
        summary: "List the current tenant's own sent inquiries",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated inquiry list",
          },
        },
      },
      post: {
        tags: ["Inquiries"],
        summary: "Send an inquiry about a property",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Created inquiry",
          },
        },
      },
    },
    "/api/inquiries/received": {
      get: {
        tags: ["Inquiries"],
        summary: "List incoming inquiries across all of the current owner's properties",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated received-inquiry list",
          },
        },
      },
    },
    "/api/inquiries/{id}": {
      put: {
        tags: ["Inquiries"],
        summary: "Respond to or close an inquiry",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Updated inquiry",
          },
        },
      },
    },
    "/api/viewings": {
      get: {
        tags: ["Viewings"],
        summary: "List the current tenant's own viewing requests",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated viewing-request list",
          },
        },
      },
      post: {
        tags: ["Viewings"],
        summary: "Request a property viewing",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Created viewing request",
          },
        },
      },
    },
    "/api/viewings/received": {
      get: {
        tags: ["Viewings"],
        summary: "List incoming viewing requests across all of the current owner's properties",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated received-viewing-request list",
          },
        },
      },
    },
    "/api/viewings/{id}/status": {
      put: {
        tags: ["Viewings"],
        summary: "Approve, reject, cancel, or complete a viewing request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Updated viewing request",
          },
        },
      },
    },
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List the current user's notifications",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated notification list",
          },
        },
      },
    },
    "/api/notifications/read-all": {
      put: {
        tags: ["Notifications"],
        summary: "Mark every notification as read",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All notifications marked read",
          },
        },
      },
    },
    "/api/notifications/{id}/read": {
      put: {
        tags: ["Notifications"],
        summary: "Mark one notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Notification marked read",
          },
        },
      },
    },
    "/api/saved-searches": {
      post: {
        tags: ["Saved searches"],
        summary: "Save a Discover location + radius search",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Created saved search",
          },
        },
      },
      get: {
        tags: ["Saved searches"],
        summary: "List the current user's saved searches",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Saved search list",
          },
        },
      },
    },
    "/api/saved-searches/{id}": {
      delete: {
        tags: ["Saved searches"],
        summary: "Delete a saved search",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Saved search deleted",
          },
        },
      },
    },
    "/api/device-tokens": {
      post: {
        tags: ["Device tokens"],
        summary: "Register (upsert by token) a device for push notifications",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Device token registered",
          },
        },
      },
      delete: {
        tags: ["Device tokens"],
        summary: "Remove a device token",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Device token removed",
          },
        },
      },
    },
    "/api/agencies/verify": {
      post: {
        tags: ["Agencies"],
        summary: "Submit agency verification details",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Verification request submitted",
          },
        },
      },
    },
    "/api/agencies/status": {
      get: {
        tags: ["Agencies"],
        summary: "Get the current agency's verification status",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Verification status",
          },
        },
      },
    },
    "/api/feedback": {
      post: {
        tags: ["Feedback"],
        summary: "Submit platform feedback (tenant, landlord, agency, or mover)",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Created feedback",
          },
        },
      },
    },
    "/api/feedback/mine": {
      get: {
        tags: ["Feedback"],
        summary: "List the current user's own submitted feedback",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Feedback list",
          },
        },
      },
    },
    "/api/feedback/public": {
      get: {
        tags: ["Feedback"],
        summary: "List published feedback for the public testimonials feed",
        responses: {
          200: {
            description: "Published feedback",
          },
        },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated user list",
          },
        },
      },
    },
    "/api/admin/users/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get a user's profile",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "User profile",
          },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a user and cascade all owned/related data (cannot target own account)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "User deleted",
          },
        },
      },
    },
    "/api/admin/users/{id}/summary": {
      get: {
        tags: ["Admin"],
        summary: "Get a user's violation counts and role-specific activity summary",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "User summary",
          },
        },
      },
    },
    "/api/admin/users/{id}/status-history": {
      get: {
        tags: ["Admin"],
        summary: "List a user's account status change history",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Status history",
          },
        },
      },
    },
    "/api/admin/users/{id}/status": {
      put: {
        tags: ["Admin"],
        summary: "Update user account status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Updated user status",
          },
        },
      },
    },
    "/api/admin/reviews": {
      get: {
        tags: ["Admin"],
        summary: "List all property reviews and ratings without deletion rights",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All property reviews",
          },
        },
      },
    },
    "/api/admin/agencies/verifications": {
      get: {
        tags: ["Admin"],
        summary: "List agency verification requests",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Agency verification list",
          },
        },
      },
    },
    "/api/admin/agencies/verifications/{id}/approve": {
      put: {
        tags: ["Admin"],
        summary: "Approve an agency verification request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Verification approved",
          },
        },
      },
    },
    "/api/admin/agencies/verifications/{id}/reject": {
      put: {
        tags: ["Admin"],
        summary: "Reject an agency verification request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Verification rejected",
          },
        },
      },
    },
    "/api/admin/movers/verifications": {
      get: {
        tags: ["Admin"],
        summary: "List mover verification requests",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Mover verification list",
          },
        },
      },
    },
    "/api/admin/movers/verifications/{id}/approve": {
      put: {
        tags: ["Admin"],
        summary: "Approve a mover verification request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Verification approved",
          },
        },
      },
    },
    "/api/admin/movers/verifications/{id}/reject": {
      put: {
        tags: ["Admin"],
        summary: "Reject a mover verification request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Verification rejected",
          },
        },
      },
    },
    "/api/admin/violations": {
      get: {
        tags: ["Admin"],
        summary: "List duplicate-image violation records",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Violation list",
          },
        },
      },
    },
    "/api/admin/violations/{id}/status": {
      put: {
        tags: ["Admin"],
        summary: "Update a violation record's review status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Updated violation status",
          },
        },
      },
    },
    "/api/admin/feedback": {
      get: {
        tags: ["Admin"],
        summary: "List all platform feedback",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All feedback",
          },
        },
      },
    },
    "/api/admin/feedback/{id}/respond": {
      put: {
        tags: ["Admin"],
        summary: "Respond to a pending feedback item",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Feedback responded to",
          },
        },
      },
    },
    "/api/movers": {
      get: {
        tags: ["Movers"],
        summary: "List public mover businesses",
        responses: {
          200: {
            description: "Paginated mover list",
          },
        },
      },
    },
    "/api/movers/profile": {
      get: {
        tags: ["Movers"],
        summary: "Get the current mover's own business profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Mover profile",
          },
        },
      },
      post: {
        tags: ["Movers"],
        summary: "Create or update the current mover's own business profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Upserted mover profile",
          },
        },
      },
    },
    "/api/movers/{id}": {
      get: {
        tags: ["Movers"],
        summary: "Get a mover business by id",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Mover detail",
          },
        },
      },
    },
    "/api/movers/{id}/affiliate": {
      put: {
        tags: ["Movers"],
        summary: "Mark a mover as a trusted affiliate of the current owner",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Affiliate added",
          },
        },
      },
      delete: {
        tags: ["Movers"],
        summary: "Remove a mover as a trusted affiliate of the current owner",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Affiliate removed",
          },
        },
      },
    },
    "/api/mover-requests": {
      get: {
        tags: ["Mover requests"],
        summary: "List the current tenant's own sent mover requests",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated mover-request list",
          },
        },
      },
      post: {
        tags: ["Mover requests"],
        summary: "Send a service request to a mover",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Created mover request, including a computed distanceKm/priceEstimate pair",
          },
        },
      },
    },
    "/api/mover-requests/received": {
      get: {
        tags: ["Mover requests"],
        summary: "List requests received by the current mover",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Paginated received-mover-request list",
          },
        },
      },
    },
    "/api/mover-requests/{id}/status": {
      put: {
        tags: ["Mover requests"],
        summary: "Accept, decline, complete (mover), or cancel (tenant) a mover request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Updated mover request",
          },
        },
      },
    },
  },
};

export default openApiSpec;
