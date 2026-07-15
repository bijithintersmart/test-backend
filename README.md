# Enterprise Node.js + Express.js TypeScript Backend

An enterprise-grade, highly scalable, and production-ready REST API backend built with **Node.js**, **Express.js**, and **TypeScript**, following strict clean-code architecture and Domain-Driven Design (DDD) principles.

---

## Table of Contents

- [Core Technology Stack](#core-technology-stack)
- [Architecture & Structural Design](#architecture--structural-design)
- [Directory Layout](#directory-layout)
- [Environment Configuration](#environment-configuration)
- [Database & Seed Setup](#database--seed-setup)
- [Asynchronous Job Processing (BullMQ)](#asynchronous-job-processing-bullmq)
- [Real-Time Communication (Socket.IO)](#real-time-communication-socketio)
- [Security & Rate Limiting](#security--rate-limiting)
- [Getting Started Locally](#getting-started-locally)
- [Docker Configuration](#docker-configuration)
- [API Documentation & Swagger](#api-documentation--swagger)
- [Testing Suite](#testing-suite)
- [Production Ready Checklists](#production-ready-checklists)

---

## Core Technology Stack

- **Runtime Engine**: Node.js (v20+ LTS recommended)
- **Framework**: Express.js with TypeScript strictly configured (`tsconfig.json` with `strict: true`, `noUnusedParameters`, `noUnusedLocals`)
- **Database ORM**: PostgreSQL with Prisma ORM v5
- **Caching & Rate Limiting**: Redis, `express-rate-limit`, `rate-limit-redis`
- **Authentication**:
  - Native JWT Access + Refresh Token rotation with revocation logging
  - Credentials Auth (Email + OTP verification, Password resets)
  - Native verification hooks for Google OAuth and Apple Sign-In ID tokens
- **Security Hashing**: Argon2 (optimized parameter values for parallelism, memory cost, and iteration cost)
- **Data Validation**: Zod (schema validations on routes and environment variables)
- **Logging**: Pino (with `pino-http` request middleware and `pino-pretty` console formatting)
- **API Spec**: Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)
- **Job Engine**: BullMQ (Redis-backed queues for background, delayed, and retriable tasks)
- **Websockets**: Socket.IO (bidirectional event-driven real-time communication)
- **File Uploads**: Multer (configured with local storage, AWS S3, and Cloudinary fallback strategies)

---

## Architecture & Structural Design

The backend uses a **Modular Clean Architecture** pattern combined with **Domain-Driven Design (DDD)** constraints. Every feature domain is encapsulated inside its own folder in `src/modules/`, guaranteeing that dependencies are isolated and decoupled.

Inside each module, code is structured as follows:

- **Routes (`*.routes.ts`)**: Registers HTTP endpoints, rate-limit guards, validation checks, and RBAC middleware.
- **Controller (`*.controller.ts`)**: Orchestrates Express `req`, `res`, `next` objects. Extracts payload parameters and passes them to service layers.
- **Service (`*.service.ts`)**: Contains all business logic, transactions, state rules, and coordination between repositories and external services (e.g., mailer, queue).
- **Repository (`*.repository.ts`)**: Manages absolute access to the Prisma ORM client. Abstracting queries ensures service layers remain decoupled from database implementations.
- **DTO & Validator (`*.validator.ts`)**: Declares request schema validation contracts using Zod.
- **Types (`*.types.ts`)**: Extends custom request variables and domain object typings.

---

## Directory Layout

``` bash
├── .github/                     # CI/CD Workflows (GitHub Actions)
├── src/
│   ├── config/                  # Configuration loaders (env parser, swagger settings)
│   ├── core/                    # Centralized middlewares & utilities
│   │   ├── errors/              # AppError subclasses & custom error hierarchies
│   │   ├── logger/              # Pino logging settings
│   │   ├── middleware/          # auth, error handler, pagination, and zod validator middlewares
│   │   ├── security/            # JWT, Argon2 helpers, rate limiting configuration
│   │   └── utils/               # Response formatters
│   ├── database/                # Database configurations
│   │   ├── prisma/              # Prisma schema definition
│   │   └── seed/                # Seed script for initial roles, permissions, and admins
│   ├── jobs/                    # BullMQ queues, workers, and background jobs
│   ├── modules/                 # Modular Domain Business logic
│   │   ├── admin/               # Admin management, reviews, and statistics
│   │   ├── ambassador/          # Ambassador wallet management, leaderboard
│   │   ├── auth/                # Sign up, OTP, JWT Rotation, reset flows
│   │   ├── champion/            # Champion achievements, mission enrollments
│   │   ├── health/              # Liveness and Readiness probes
│   │   ├── uploads/             # Size limiters, file sanitizations
│   │   └── users/               # User database CRUD, profile operations
│   ├── routes/                  # API V1 Router Aggregator
│   ├── services/                # Singleton integrations (Redis client, nodemailer)
│   ├── app.ts                   # Express application setup
│   └── server.ts                # Bootstrap & socket server instantiation
├── tests/
│   ├── integration/             # Integration tests (Supertest + App context)
│   └── unit/                    # Unit tests (Argon2, JWT utilities)
├── Dockerfile                   # Multi-stage production container build
├── docker-compose.yml           # Database, Redis, and Web Stack orchestration
├── tsconfig.json                # Strict TypeScript configuration
└── package.json                 # Project dependencies & automation scripts
```

---

## Environment Configuration

Configuration values are parsed and validated at boot using a strict Zod schema in `src/config/env.ts`.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Listening port for Express / Socket server | `3000` |
| `NODE_ENV` | Environment context | `development`, `production`, `test` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/db` |
| `REDIS_URL` | Redis server address | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Secret key for access token signature | `some-long-random-string` |
| `JWT_REFRESH_SECRET` | Secret key for refresh token signature | `another-long-random-string` |
| `JWT_ACCESS_EXPIRATION` | Expiration time for access token | `15m` |
| `JWT_REFRESH_EXPIRATION`| Expiration time for refresh token | `7d` |
| `SMTP_HOST` | Outgoing SMTP mail server | `smtp.mailtrap.io` |
| `SMTP_PORT` | SMTP port | `2525` or `465` |
| `SMTP_USER` | SMTP username | `smtp-user` |
| `SMTP_PASS` | SMTP password | `smtp-pass` |
| `SMTP_FROM` | Default sender email | `no-reply@enterprise.com` |
| `STORAGE_PROVIDER` | Upload driver | `local`, `s3`, `cloudinary` |
| `AWS_ACCESS_KEY_ID` | Amazon credentials | `aws-key-id` |
| `AWS_SECRET_ACCESS_KEY` | Amazon secret key | `aws-secret` |
| `AWS_REGION` | S3 Region | `us-east-1` |
| `AWS_BUCKET_NAME` | S3 bucket destination | `enterprise-bucket` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter period | `900000` (15 mins) |
| `RATE_LIMIT_MAX` | Request limit per IP inside window | `100` |

---

## Database & Seed Setup

PostgreSQL tables are configured with soft deletes (`deletedAt` timestamps) and normalized RBAC tables (Users -> Roles -> RolePermissions -> Permissions).

### Generate Prisma Client

Generates strict TypeScript typings from the database schema:

```bash
npm run prisma:generate
```

### Apply Migrations

Applies incremental SQL schemas onto the PostgreSQL instance:

```bash
npm run prisma:migrate
```

### Run Seeding

Populates default roles (`Admin`, `Ambassador`, `Champion`) and basic permission policies:

```bash
npm run prisma:seed
```

### Prisma Studio

Launch database editor GUI at `http://localhost:5555`:

```bash
npm run prisma:studio
```

---

## Asynchronous Job Processing (BullMQ)

Delayed and performance-heavy tasks run out-of-band via BullMQ workers.

- **Workers** (`src/jobs/worker.ts`): Subscribes to queues and processes background jobs.
- **Queues** (`src/jobs/queue.ts`): Registers named queues (`email`, `notification`, `reports`, `cleanup`).
- **Cron Jobs**: The `cleanup` queue runs on a recurring cron interval, automatically removing expired OTP verification codes and blacklisted refresh tokens.

---

## Real-Time Communication (Socket.IO)

The backend exposes a Socket.IO connection attached to the same HTTP server (`src/server.ts`).

- **Authorization**: The server intercepts connection handshakes to validate native JWT credentials (checking cache first).
- **Rooms**: Users are bound into isolated rooms matching their User ID (`user_{id}`) and Role Name (`role_Admin`). This guarantees target-specific real-time pushes without payload leakage.

---

## Security & Rate Limiting

1. **Helmet**: Configures secure HTTP headers (protects against XSS, clickjacking, mime-sniffing).
2. **CORS**: Strict domain validation limiting cross-origin requests.
3. **Rate Limiting**: Brute-force prevention configured via `express-rate-limit` using `rate-limit-redis` as a shared distributed store (mitigates memory exhaustion).
4. **Token Rotation**: Implements JWT refresh token rotation with immediate revocation of the entire family chain if a compromised token is reused.
5. **Argon2**: Enforces slow hashing constraints, safeguarding password databases against offline dictionary and GPU brute-force attacks.

---

## Getting Started Locally

### Prerequisites

- Node.js (v20+ LTS)
- PostgreSQL
- Redis

### Step 1: Clone and Install

```bash
git clone <repository_url>
cd backend
npm install
```

### Step 2: Configure Environment

Copy `.env.example` into a new `.env` file and fill in your local Postgres and Redis credentials.

### Step 3: Database Bootstrap

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Step 4: Run Development Server

Starts the application in watch-mode with hot reloading:

```bash
npm run dev
```

---

## Docker Configuration

The application includes a fully optimized multi-stage build `Dockerfile` and a `docker-compose.yml` stack.

### Spin up entire environment

Launches PostgreSQL, Redis, web application instance, and BullMQ worker:

```bash
docker-compose up --build -d
```

### Tear down environment

```bash
docker-compose down -v
```

---

## API Documentation & Swagger

Automated interactive OpenAPI docs are built via `swagger-jsdoc` and compiled directly from inline controller/route documentation blocks.

- **Swagger GUI**: Available at `http://localhost:3000/docs` (when server is running).
- **Core Endpoints**:
  - `POST /api/v1/auth/register` : Client signup with Zod validation.
  - `POST /api/v1/auth/login` : Credentials login returning JWT tokens.
  - `POST /api/v1/auth/refresh` : Refresh token rotation.
  - `GET /api/v1/health` : CPU, Uptime, Memory report.
  - `GET /api/v1/health/ready` : Active database & Redis status checks.

---

## Testing Suite

The project includes unit and integration test specs configured on top of Jest and `ts-jest`.

- **Run all tests**:

  ```bash
  npm run test
  ```

- **Run watch mode**:

  ```bash
  npm run test:watch
  ```

- **Generate coverage report**:

  ```bash
  npm run test:coverage
  ```

---

## Production Ready Checklists

- [ ] Modify `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to highly-secure random keys in production.
- [ ] Configure SMTP credentials to a reliable sender client (e.g. Amazon SES, SendGrid).
- [ ] Migrate files uploading location to AWS S3 by changing `STORAGE_PROVIDER=s3`.
- [ ] Deploy instances inside private subnets using reverse proxies (e.g., Nginx, Cloudflare) protecting against DDoS attacks.
- [ ] Scale queue operations by starting dedicated worker processes (`node dist/jobs/worker.js`) independent from the web instance.
- [ ] Keep PostgreSQL index metrics monitored and configure periodic database vacuuming.
