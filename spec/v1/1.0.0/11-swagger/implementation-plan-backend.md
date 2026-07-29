# 1.0.0 11-swagger — Implementation Plan (backend)

## What changes

| File | Change |
|------|--------|
| `pom.xml` | Add the springdoc dependency |
| `application.properties` | Add the springdoc config |
| `config/SecurityConfig.java` | Permit the Swagger paths and relax the CSP |
| `config/OpenApiConfig.java` | New — API info and the JWT security scheme |
| `controller/ApplicationController.java` | `@Tag` |
| `controller/AuthController.java` | `@Tag` plus `@Operation` on four endpoints |
| `controller/AdminController.java` | `@Tag` plus `@Operation` |
| `controller/CVController.java` | `@Tag` |
| `controller/NoteController.java` | `@Tag` |
| `controller/StatisticsController.java` | `@Tag` |
| `controller/SystemController.java` | `@Tag` |

**Design decisions**

- **`springdoc-openapi-starter-webmvc-ui` 2.8.x**, the version compatible with
  Spring Boot 3.4. Nothing is written by hand.
- **Swagger is always enabled**, with no prod/dev split. This is a portfolio
  project and visibility is the goal.
- **A JWT Bearer scheme**, so one "Authorize" button in the UI takes the access
  token and every later call carries `Authorization: Bearer <token>`.
- **`@Tag` on controllers, `@Operation` only where the purpose is not obvious.**
  That avoids annotation noise while still grouping endpoints clearly.
- **No `@Schema` on DTOs.** springdoc infers field names and types from the
  class, which is good enough here.

## Step 1 — Dependency, properties, security permit

**Build**

`pom.xml`:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.8</version>
</dependency>
```

`application.properties`:

```properties
# Swagger / OpenAPI
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.api-docs.path=/v3/api-docs
springdoc.swagger-ui.operations-sorter=alpha
springdoc.swagger-ui.tags-sorter=alpha
```

`SecurityConfig` — add `/swagger-ui/**`, `/swagger-ui.html` and `/v3/api-docs/**`
to the public `requestMatchers` block, next to `/privacy` and `/api/auth/**`, and
relax the CSP so Swagger UI's inline scripts and styles load.

**Done when** `./mvnw spring-boot:run` then `http://localhost:8080/swagger-ui.html`
loads the UI with every endpoint visible.

**Checklist**
- [x] Dependency added
- [x] springdoc properties added
- [x] Swagger paths permitted and the CSP relaxed

## Step 2 — Global API info and the JWT scheme

**Build** — a new `config/OpenApiConfig.java`:

```java
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "Applikon API",
        description = "Job application tracker for IT candidates in Poland.",
        version = "1.0.0",
        contact = @Contact(name = "Jakub Bone", email = "jakub.bone1990@gmail.com")
    ),
    security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT"
)
public class OpenApiConfig {}
```

**Done when** Swagger UI shows an "Authorize" button, and pasting a valid access
token makes calls to authenticated endpoints return 200.

**Checklist**
- [x] `OpenApiConfig` created with the API info and the Bearer scheme
- [x] "Authorize" accepts a token and authenticated calls return 200

## Step 3 — Controller annotations

**Build** — `@Tag` on every controller, and `@Operation` where the purpose is not
obvious.

| Controller | Annotations |
|---|---|
| `ApplicationController` | `@Tag(name = "Applications", …)` |
| `AuthController` | `@Tag(name = "Auth", …)` plus `@Operation` on `POST /api/auth/refresh`, `POST /api/auth/consent`, `DELETE /api/auth/me`, `GET /api/auth/me/export` |
| `AdminController` | `@Tag(name = "Admin", …)` plus `@Operation` on `POST /api/admin/notices` |
| `CVController` | `@Tag(name = "CV", …)` |
| `NoteController` | `@Tag(name = "Notes", …)` |
| `StatisticsController` | `@Tag(name = "Statistics", …)` |
| `SystemController` | `@Tag(name = "System", …)` |

`StatisticsController` and `SystemController` were not in the original list and
were added for completeness.

**Done when** Swagger UI groups endpoints under named tags and the non-obvious
ones carry a summary.

**Checklist**
- [x] `@Tag` on all seven controllers
- [x] `@Operation` on the five non-obvious endpoints
- [x] `./mvnw test` green, run once after all three steps
