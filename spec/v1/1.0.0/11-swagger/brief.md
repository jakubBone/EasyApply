# 1.0.0 — Swagger / OpenAPI

## 1. Problem

The application is being prepared for public deployment and for publication on
GitHub. Right now there is no API documentation at all: endpoints, request bodies
and response shapes are discoverable only by reading the source.

Anyone visiting the repository has to run the application locally to see what the
API offers. For a portfolio project that is a missed signal — Swagger UI on a
live URL shows the whole API at a glance, auth and admin endpoints included.

There is also a practical problem. Without a configured security scheme, an
authenticated endpoint cannot be tried from Swagger UI, because every call comes
back `401`.

Spring Boot 3.4 integrates cleanly with `springdoc-openapi` 2.x, which generates
an OpenAPI 3 spec from the existing code and serves the UI. No spec is written by
hand.

## 2. Solution

Add `springdoc-openapi-starter-webmvc-ui` and configure it. Backend only, no
frontend change.

- The dependency in `pom.xml`, and the `springdoc.*` properties in
  `application.properties`.
- `SecurityConfig` permits `/swagger-ui/**` and `/v3/api-docs/**`.
- Global API metadata — title, description, version, contact — through
  `@OpenAPIDefinition` on a dedicated `OpenApiConfig`.
- A JWT Bearer `@SecurityScheme`, so the UI shows an "Authorize" button, plus
  `@SecurityRequirement` on the controllers that need auth.
- `@Tag` on every controller, to group endpoints by domain.
- `@Operation` only where the purpose is not obvious: `POST /api/auth/refresh`,
  `POST /api/auth/consent`, `DELETE /api/auth/me`, `GET /api/auth/me/export`,
  `POST /api/admin/notices`.

Swagger UI is publicly accessible. This is a portfolio project, and visibility is
the point.

## 3. Out of scope

- **`@Schema` on DTOs.** The generated schema is readable enough.
- **`@ApiResponse` on every endpoint.** Too much annotation noise for the value.
- **Disabling Swagger in production.** Counterproductive here.
- **A separate config per profile.** One config, always enabled.
- **Exporting the OpenAPI spec as a static file.** The live UI is enough.

## 4. Done when

- `/swagger-ui.html` loads and shows all controllers grouped by tag.
- The "Authorize" button accepts a JWT Bearer token.
- An authenticated endpoint such as `GET /api/applications` returns 200 when
  called from Swagger UI with a valid token.
- Swagger paths are not blocked by Spring Security.
