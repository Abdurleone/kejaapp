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
  },
};

export default openApiSpec;
