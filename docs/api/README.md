# API: quick reference and examples

This folder contains quick API examples to help integrators and developers. The Insomnia collection `docs/kejaapp-insomnia.json` can be imported directly into Insomnia or Postman.

Authentication
- The API uses token-based authentication. Typical flow:
  1. POST /api/auth/login with JSON body { email, password }
  2. Receive JSON { token }
  3. Use header `Authorization: Bearer <token>` on subsequent requests

Example curl calls

1) Login (get token)

```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password"}' | jq

# Example response:
# { "token": "eyJhbGci..." }
```

2) List properties (public or token-protected depending on API)

```bash
curl -s -H "Authorization: Bearer <TOKEN>" \
  http://localhost:5000/api/properties | jq
```

3) Create a property/listing (example)

```bash
curl -s -X POST http://localhost:5000/api/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Nice 1BR","address":"123 Example St","price":500}' | jq
```

OpenAPI skeleton (minimal)

File: docs/api/openapi.yaml

```yaml
openapi: 3.0.0
info:
  title: KejaApp API (skeleton)
  version: 0.1.0
servers:
  - url: http://localhost:5000
paths:
  /api/auth/login:
    post:
      summary: Login and return bearer token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
  /api/properties:
    get:
      summary: List properties
      responses:
        '200':
          description: A list of properties
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
    post:
      summary: Create a property
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                address:
                  type: string
                price:
                  type: number
      responses:
        '201':
          description: Created
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Notes
- This OpenAPI is a minimal skeleton for starters — expand and validate it against the real API endpoints. You can generate better docs or SDKs from a complete OpenAPI spec.
- If you prefer, use the included `docs/kejaapp-insomnia.json` to import all endpoints to your local API client.
