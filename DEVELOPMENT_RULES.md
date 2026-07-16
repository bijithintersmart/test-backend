# Project Development & AI Rulebook

This document contains rules and guidelines that must be strictly followed by all developers and AI coding assistants working on this codebase.

---

## 1. Keep Commands Simple & Standard (Single-Developer Project)

* **No Complex Command Pipelines:** Do not suggest or execute over-engineered script chains, arbitrary nested sub-shells, or elaborate multi-tool workflows.
* **Standard Tooling:** Stick to the standard npm scripts defined in [package.json](file:///Users/intersamrt/Documents/backend/package.json):
  * Running development server: `npm run dev`
  * Compiling project: `npm run build`
  * Running tests: `npm run test`
  * Prisma migrations: `npx prisma migrate dev --schema=src/database/prisma/schema.prisma`
* **Direct Actions:** Run commands directly, clearly, and only when necessary. Avoid wrapping simple files executions in custom shell scripts.

---

## 2. Implement Actionable & Documented TODOs

* **No Half-Finished Code without Notes:** Never leave empty code blocks, dummy functions, or placeholder returns without documentation.
* **Detailed TODO Format:** If a function or branch needs to be completed later, prefix it with `// TODO:` followed by a clear, step-by-step description of what needs to be done.
  * *Example:*

    ```typescript
    // TODO: Connect to third-party SMS provider and send verification code.
    // 1. Fetch credentials from env variables.
    // 2. Format phone number to E.164.
    // 3. Make HTTP request to SMS gateway.
    ```

---

## 3. Minimalist Code & No Over-Engineering (YAGNI)

* **Write Only What Is Requested:** Follow the YAGNI principle ("You Aren't Gonna Need It"). Do not write speculative code, extra utility classes, or generic wrappers for features that are not explicitly requested.
* **Limit Helper Functions:** Write direct, readable code. Do not split logic into tiny, unnecessary helper functions unless the same code block is reused at least 3 times.
* **Clean Integrations:** When adding features, integrate them into existing controllers and services rather than generating entirely new folders or layers unless absolutely required.

---

## 4. Proper Naming & Calling Conventions

* **TypeScript Standards:**
  * **Variables & Functions:** `camelCase` (e.g., `sanitizeUser`, `getAllowedMethods`).
  * **Classes, Interfaces & Enums:** `PascalCase` (e.g., `HealthController`, `MethodNotAllowedError`).
  * **Files:** Match the export (e.g., `user.service.ts` containing `UserService`).
* **Signature Alignment:** Ensure all function and method invocations match their type definitions and schemas exactly. Do not pass parameters that are not defined in the interface.
* **Imports:** Keep imports structured. Clean up unused imports immediately upon editing files.

---

## 5. Folder Directory Map & Layered Architecture

All code must adhere to the modular, layered architectural structure. Place new domains and features strictly under `/src/modules` using the following file map:

```text
src/
├── core/                   # Shared infrastructure configurations
│   ├── errors/             # Custom global error classes
│   ├── middleware/         # Global Express middlewares (auth, validation, errors)
│   ├── security/           # Global security configurations (rate limiters)
│   └── utils/              # Helper utilities (response formatters, uuids)
├── modules/                # Domain-specific modules (auth, users, champion, etc.)
│   └── [module-name]/
│       ├── [name].routes.ts       # Endpoint routing definitions
│       ├── [name].controller.ts   # HTTP request parsing and response flow
│       ├── [name].service.ts      # Core business logic and database transaction logic
│       ├── [name].repository.ts   # Direct database queries (Prisma Client interface)
│       └── [name].validator.ts    # Zod payload validation schemas
└── jobs/                   # Background jobs and BullMQ worker configurations
```

### Layer Rules

* **Routes:** Route files must only mount middleware and call the respective controller method.
* **Controllers:** Controllers must only handle validation checks and delegate the workload to the service layer.
* **Services:** Services must execute all business rules, transactions, and background tasks. They must remain framework-agnostic (no Express `req`/`res` objects).
* **Repositories:** Repositories must perform actual database CRUD queries via the Prisma Client.

---

## 6. Centralized Middleware & Security Concerns

Cross-cutting security and utility concerns must be registered globally or at the routing layer via middleware, rather than handled inline:

* **Security Headers & CORS:** Standardized security headers must be configured globally using `helmet` and `cors` in `app.ts`. Disable `contentSecurityPolicy` in development to prevent local TLS asset errors on `localhost`.
* **Payload Validation:** Validate all incoming HTTP request bodies, parameters, and query parameters via the global `validateRequest(zodSchema)` middleware before reaching the controller.
* **Rate Limiting:** Protect endpoints globally with `rateLimiter` (general endpoints) and `strictRateLimiter` (sensitive endpoints like authentication, passwords, or registration).
* **Errors & Responses:** Format all successful responses using `sendSuccess` and forward all errors using `next(error)` to let the centralized `errorHandler` format standard JSON responses.

---

## 7. Package Versioning & Dependency Rules

* **Use Latest Stable Versions:** When adding new NPM packages or upgrading existing ones, always check for and install the **latest stable version** (avoid installing deprecated or legacy packages).
* **Avoid Obsolete Methods:** Never write code using deprecated or outdated NPM library methods. Verify documentation for current API specifications (e.g., use modern Prisma methods, correct BullMQ options, updated Express utilities).
* **Check Vulnerabilities:** Ensure all added packages are production-grade and do not introduce severe security vulnerabilities. Run verification commands (`npm audit`) periodically to check for warnings.
