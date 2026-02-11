# Starter Project - Comprehensive Documentation

This document covers every file in the backend of the project (excluding `web/`), describing its purpose, every struct, function, constant, and how they connect to the rest of the codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Root Configuration Files](#4-root-configuration-files)
   - [go.mod](#41-gomod)
   - [go.sum](#42-gosum)
   - [Makefile](#43-makefile)
   - [docker-compose.yml](#44-docker-composeyml)
   - [.air.toml](#45-airtoml)
   - [sqlc.yaml](#46-sqlcyaml)
   - [.env.example](#47-envexample)
   - [.env.development](#48-envdevelopment)
   - [.gitignore](#49-gitignore)
   - [.vscode/settings.json](#410-vscodesettingsjson)
   - [.claude/settings.local.json](#411-claudesettingslocaljson)
   - [README.md](#412-readmemd)
5. [Entry Point - cmd/server/main.go](#5-entry-point---cmdservermaingo)
6. [Configuration - internal/config/](#6-configuration---internalconfig)
7. [Domain Layer - internal/domain/](#7-domain-layer---internaldomain)
   - [auth.go](#71-authgo)
   - [session.go](#72-sessiongo)
8. [API Layer - internal/api/](#8-api-layer---internalapi)
   - [router.go](#81-routergo)
   - [auth.go](#82-authgo)
   - [avatar.go](#83-avatargo)
   - [recipes.go](#84-recipesgo)
   - [cookies.go](#85-cookiesgo)
   - [audit.go](#86-auditgo)
   - [middleware.go](#87-middlewarego)
   - [health.go](#88-healthgo)
   - [security.go](#89-securitygo)
   - [docs.go](#810-docsgo)
   - [static.go](#811-staticgo)
   - [scalar.html](#812-scalarhtml)
9. [Storage Layer - internal/storage/](#9-storage-layer---internalstorage)
   - [store.go](#91-storego)
   - [queries.sql](#92-queriessql)
   - [db/db.go](#93-dbdbgo)
   - [db/models.go](#94-dbmodelsgo)
   - [db/querier.go](#95-dbqueriergo)
   - [db/queries.sql.go](#96-dbqueriessqlgo)
   - [blob/client.go](#97-blobclientgo)
10. [Application Layer - internal/app/recipes/](#10-application-layer---internalapprecipes)
    - [types.go](#101-typesgo)
    - [ports.go](#102-portsgo)
    - [service.go](#103-servicego)
11. [AI Layer - internal/ai/recipes/](#11-ai-layer---internalairecipes)
12. [Email - internal/email/](#12-email---internalemail)
13. [Rate Limiting - internal/ratelimit/](#13-rate-limiting---internalratelimit)
14. [Background Services - internal/service/](#14-background-services---internalservice)
15. [Assets - assets/](#15-assets---assets)
16. [Database Migrations - migrations/](#16-database-migrations---migrations)
17. [Generated Docs - docs/](#17-generated-docs---docs)
18. [Utility Scripts - scripts/](#18-utility-scripts---scripts)
19. [Request Flows](#19-request-flows)
20. [Environment Variables Reference](#20-environment-variables-reference)
21. [Security Model](#21-security-model)

---

## 1. Project Overview

This is a full-stack web application with a **Go backend** and a **SvelteKit frontend**. The backend provides:

- **User authentication** (email/password + Google OAuth 2.0)
- **Session management** (cookie-based, server-side sessions stored in PostgreSQL)
- **AI-powered recipe generation** (Google Gemini via Firebase Genkit)
- **Avatar/profile picture uploads** (presigned URLs via S3-compatible storage / MinIO)
- **Audit logging** (tracks all security-relevant events)
- **Rate limiting** (sliding window algorithm via Valkey/Redis)
- **Email verification** (SMTP via Gmail)

**Tech stack:**
- **Language:** Go 1.25+
- **Database:** PostgreSQL 17 (via pgx driver + sqlc code generation)
- **Cache/Rate Limiting:** Valkey 8 (Redis-compatible)
- **Object Storage:** MinIO (S3-compatible)
- **AI:** Google Genkit with Gemini 2.5 Flash
- **Frontend:** SvelteKit, Svelte 5, Tailwind CSS 4, TypeScript, Bun

**Go module path:** `github.com/mounis-bhat/starter`

---

## 2. Architecture

The project follows a **layered architecture** inspired by hexagonal/ports-and-adapters patterns:

```
┌─────────────────────────────────────────────────────┐
│                   cmd/server/main.go                │  ← Entry point / wiring
├─────────────────────────────────────────────────────┤
│                    internal/api/                     │  ← HTTP handlers, middleware, routing
├─────────────────────────────────────────────────────┤
│                   internal/domain/                   │  ← Business rules (password hashing,
│                                                     │     session logic, validation)
├─────────────────────────────────────────────────────┤
│              internal/app/recipes/                   │  ← Application services (orchestration)
├─────────────────────────────────────────────────────┤
│             internal/ai/recipes/                     │  ← AI adapter (Genkit/Gemini)
│             internal/email/                          │  ← Email adapter (Gmail SMTP)
│             internal/ratelimit/                      │  ← Rate limit adapter (Valkey)
│             internal/storage/                        │  ← Database adapter (PostgreSQL)
│             internal/storage/blob/                   │  ← Blob storage adapter (S3/MinIO)
├─────────────────────────────────────────────────────┤
│             internal/service/                        │  ← Background services (cron jobs)
└─────────────────────────────────────────────────────┘
```

**Data flows top-to-bottom.** The API layer calls domain logic and storage. The domain layer never imports from `api/`. The `app/recipes` layer defines a `Generator` interface (port) that the `ai/recipes` layer implements (adapter).

---

## 3. Directory Structure

```
starter/
├── .air.toml                    # Hot reload configuration
├── .env.development             # Development env vars (gitignored, has real secrets)
├── .env.example                 # Environment variable template (committed)
├── .claude/
│   └── settings.local.json      # Claude Code local permission settings
├── .gitignore                   # Git ignore rules
├── .vscode/settings.json        # VSCode spell-check dictionary
├── assets/
│   ├── embed.go                 # Go embed directive for production static files
│   └── static/.gitkeep          # Placeholder for SvelteKit build output
├── cmd/server/
│   └── main.go                  # Application entry point
├── docker-compose.yml           # Local dev infrastructure
├── docs/
│   ├── docs.go                  # Generated Swagger registration (auto-generated)
│   ├── openapi.json             # Generated OpenAPI spec (auto-generated)
│   ├── swagger.json             # Generated Swagger spec (auto-generated)
│   └── swagger.yaml             # Generated Swagger YAML (auto-generated)
├── go.mod                       # Go module definition
├── go.sum                       # Go dependency checksums
├── internal/
│   ├── ai/recipes/
│   │   └── genkit_generator.go  # Genkit/Gemini AI recipe generator
│   ├── api/
│   │   ├── audit.go             # Audit logging helper
│   │   ├── auth.go              # Authentication HTTP handlers
│   │   ├── avatar.go            # Avatar upload/download handlers
│   │   ├── cookies.go           # Cookie manager
│   │   ├── docs.go              # API documentation serving
│   │   ├── health.go            # Health check endpoint
│   │   ├── middleware.go         # Middleware placeholder
│   │   ├── recipes.go           # Recipe generation endpoint
│   │   ├── router.go            # Route registration
│   │   ├── scalar.html          # Scalar API docs HTML template
│   │   ├── security.go          # Security headers middleware
│   │   └── static.go            # Static file / SPA serving
│   ├── app/recipes/
│   │   ├── ports.go             # Generator interface definition
│   │   ├── service.go           # Recipe service (orchestrator)
│   │   └── types.go             # RecipeRequest and Recipe structs
│   ├── config/
│   │   └── config.go            # Configuration loading from env vars
│   ├── domain/
│   │   ├── auth.go              # Password hashing, email validation
│   │   └── session.go           # Session creation, validation, revocation
│   ├── email/
│   │   └── mailer.go            # Gmail SMTP email sender
│   ├── ratelimit/
│   │   └── valkey.go            # Valkey-based sliding window rate limiter
│   ├── service/
│   │   └── audit_cleanup.go     # Cron-based audit log purge service
│   └── storage/
│       ├── blob/
│       │   └── client.go        # S3/MinIO presigned URL client
│       ├── db/
│       │   ├── db.go            # sqlc database init (auto-generated)
│       │   ├── models.go        # sqlc Go models (auto-generated)
│       │   ├── querier.go       # sqlc Querier interface (auto-generated)
│       │   └── queries.sql.go   # sqlc query implementations (auto-generated)
│       ├── queries.sql          # SQL query definitions for sqlc
│       └── store.go             # Database connection pool + migration check
├── Makefile                     # Build and dev commands
├── migrations/
│   ├── 001_create_users.sql     # Users table
│   ├── 002_create_sessions.sql  # Sessions table
│   ├── 003_create_audit_logs.sql# Audit logs table
│   └── 004_add_email_verification.sql # Email verification columns
├── README.md                    # Project README
├── scripts/audit/
│   ├── README.md                # Audit scripts documentation
│   ├── audit_logs_by_event.sql  # Query logs by event type
│   ├── audit_logs_by_user.sql   # Query logs by user ID
│   ├── audit_logs_recent.sql    # Query recent logs (7 days)
│   └── purge_audit_logs.sql     # Purge logs older than 90 days
├── sqlc.yaml                    # sqlc code generation config
└── web/                         # (excluded from this doc)
```

---

## 4. Root Configuration Files

### 4.1 go.mod

**Path:** `go.mod`
**Purpose:** Defines the Go module and all dependencies.

**Module path:** `github.com/mounis-bhat/starter`
**Go version:** 1.25.6

**Key direct dependencies:**

| Dependency | Purpose |
|---|---|
| `github.com/firebase/genkit/go v1.4.0` | AI framework for recipe generation (Genkit) |
| `github.com/jackc/pgx/v5 v5.8.0` | PostgreSQL driver with connection pooling |
| `github.com/joho/godotenv v1.5.1` | Loads `.env` files into environment variables |
| `github.com/redis/go-redis/v9 v9.17.3` | Redis/Valkey client for rate limiting |
| `github.com/robfig/cron/v3 v3.0.1` | Cron scheduler for audit log cleanup |
| `github.com/google/uuid v1.6.0` | UUID generation and parsing |
| `github.com/swaggo/swag v1.16.6` | Swagger/OpenAPI spec generation from annotations |
| `github.com/MarceloPetrucio/go-scalar-api-reference` | Scalar API documentation UI rendering |
| `golang.org/x/crypto v0.41.0` | Argon2id password hashing |
| `golang.org/x/oauth2 v0.34.0` | Google OAuth 2.0 client |
| `github.com/aws/aws-sdk-go-v2/...` | AWS SDK for S3/MinIO presigned URLs |

**Notable indirect dependencies:**
- `google.golang.org/genai` - Google AI client (used by Genkit)
- `go.opentelemetry.io/otel` - OpenTelemetry tracing (Genkit dependency)
- Various JSON schema libraries for Genkit's structured output

---

### 4.2 go.sum

**Path:** `go.sum`
**Purpose:** Cryptographic checksums for all dependencies. Ensures reproducible builds. Auto-generated by Go tooling; never manually edited.

---

### 4.3 Makefile

**Path:** `Makefile`
**Purpose:** Central command runner for development, building, and operations.

**Targets:**

| Target | What it does |
|---|---|
| `help` | (Default) Prints all available targets |
| `install` | Installs Go tools (genkit CLI, swag, air, goose, sqlc) and runs `bun install` in `web/` |
| `dev` | Starts everything: Docker services, Genkit UI, Go server (via air), SvelteKit dev server. Runs `make types` first. Traps SIGINT to cleanly shut down Docker. |
| `dev-logs` | Shows Docker Compose logs |
| `dev-go` | Runs `genkit start -- air` (Go server with hot reload + Genkit dev UI) |
| `dev-web` | Runs `bun dev` in `web/` (SvelteKit only) |
| `db` | Starts Postgres, Valkey, and MinIO containers |
| `db-stop` | Stops all Docker Compose services |
| `db-drop` | Drops the Postgres database by executing `DROP DATABASE` inside the container |
| `valkey-flush` | Runs `FLUSHALL` on Valkey to clear all keys |
| `migrate-up` | Runs all pending goose migrations. Uses `GOOSE_CMD` which URL-encodes the password via Python. |
| `migrate-down` | Rolls back the last migration |
| `migrate-status` | Shows which migrations have been applied |
| `migrate-create` | Creates a new SQL migration file. Requires `NAME=migration_name` |
| `sqlc` | Runs `sqlc generate` to regenerate Go code from SQL queries |
| `swag` | Runs `swag init` to regenerate OpenAPI spec from Go annotations |
| `types` | Runs `swag` then generates TypeScript types in `web/` from the OpenAPI spec |
| `build` | Full production build: generates swagger, builds SvelteKit, copies output to `assets/static/`, compiles Go binary to `dist/server` |
| `run` | Runs the production binary from `dist/` with `ENV=production` |
| `clean` | Removes `server`, `tmp`, `dist`, `assets/static/*`, `web/build` |

**Helper variable `LOAD_ENV`:** `set -a && . ./.env.development && set +a` - sources the dev env file and exports all variables before running Docker Compose commands.

**Helper variable `GOOSE_CMD`:** Constructs the full goose command with a Postgres connection URL, URL-encoding the password using Python's `urllib.parse.quote` to handle special characters.

---

### 4.4 docker-compose.yml

**Path:** `docker-compose.yml`
**Purpose:** Defines local development infrastructure.

**Services:**

#### `postgres`
- **Image:** `postgres:17-alpine`
- **Container name:** `app-postgres`
- **Port:** `127.0.0.1:5432:5432` (localhost only)
- **Auth method:** `scram-sha-256` (more secure than the default `md5`)
- **Volume:** `postgres_data` for data persistence
- **Health check:** `pg_isready` every 5 seconds
- **Memory limit:** 512MB
- **Security:** `no-new-privileges:true`
- **Required env vars:** `POSTGRES_USER`, `POSTGRES_PASSWORD` (required), `POSTGRES_DB`

#### `valkey`
- **Image:** `valkey/valkey:8-alpine`
- **Container name:** `app-valkey`
- **Port:** `127.0.0.1:6379:6379` (localhost only)
- **Command:** Runs with append-only log, 128MB max memory, LRU eviction, password authentication
- **Volume:** `valkey_data` for persistence
- **Health check:** `valkey-cli ping` every 5 seconds
- **Memory limit:** 256MB
- **Required env vars:** `VALKEY_PASSWORD` (required)

#### `minio`
- **Image:** `minio/minio:RELEASE.2025-09-07T16-13-09Z`
- **Container name:** `app-minio`
- **Ports:** `127.0.0.1:9000` (API), `127.0.0.1:9001` (console UI)
- **Command:** `server /data --console-address ":9001"`
- **Volume:** `minio_data` for persistence
- **Memory limit:** 512MB
- **Required env vars:** `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (both required)

#### `minio-init`
- **Image:** `minio/mc:RELEASE.2025-08-13T08-35-41Z` (MinIO Client)
- **Container name:** `app-minio-init`
- **Purpose:** One-shot init container that waits for MinIO to be ready, then creates the configured bucket (`MINIO_BUCKET`, defaults to `images`).
- **Depends on:** `minio`
- **Memory limit:** 128MB

**Volumes:** `postgres_data`, `valkey_data`, `minio_data` (all unnamed/local)

---

### 4.5 .air.toml

**Path:** `.air.toml`
**Purpose:** Configuration for [Air](https://github.com/air-verse/air), a Go hot-reload tool.

**Key settings:**
- **Build command:** `go build -o ./tmp/main ./cmd/server`
- **Binary:** `./tmp/main`
- **Full binary:** `ENV=development ./tmp/main` (sets env before running)
- **Watched extensions:** `.go`, `.tpl`, `.tmpl`, `.html`
- **Excluded directories:** `assets`, `tmp`, `vendor`, `web`, `web-dist`, `node_modules`, `docs`
- **Excluded files:** `_test.go`
- **Delay:** 1000ms (waits 1 second after file change before rebuilding)
- **Clean on exit:** `true` (removes `tmp/` directory when stopping)

---

### 4.6 sqlc.yaml

**Path:** `sqlc.yaml`
**Purpose:** Configuration for [sqlc](https://sqlc.dev/), which generates type-safe Go code from SQL queries.

**Settings:**
- **Engine:** PostgreSQL
- **Query source:** `internal/storage/queries.sql`
- **Schema source:** `migrations/` (reads all migration files to understand the schema)
- **Output package:** `db`
- **Output directory:** `internal/storage/db`
- **SQL package:** `pgx/v5` (uses the pgx PostgreSQL driver)
- **Emit JSON tags:** `true` (all struct fields get `json:"..."` tags)
- **Emit interface:** `true` (generates a `Querier` interface)
- **Emit empty slices:** `true` (returns `[]T{}` instead of `nil` for empty results)

**How it works:** You write SQL in `queries.sql` with special `-- name: FunctionName :one/:many/:exec` comments. Running `sqlc generate` reads those queries + the migration schema and generates Go structs and functions in `internal/storage/db/`.

---

### 4.7 .env.example

**Path:** `.env.example`
**Purpose:** Template for environment variables. Copy to `.env.development` and fill in values.

**Variable groups:**

| Group | Variables |
|---|---|
| Server | `PORT` (3400), `ENV` (development/production) |
| AI | `GEMINI_API_KEY` |
| Database | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_SSLMODE`, `SKIP_MIGRATION_CHECK` |
| Valkey | `VALKEY_HOST`, `VALKEY_PORT`, `VALKEY_PASSWORD` |
| Rate Limiting | `RATE_LIMIT_ENABLED`, per-endpoint `_LIMIT` and `_WINDOW_SECONDS` for register, login, password, verify-email, google, logout |
| S3/MinIO | `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` |
| Auth | `AUTH_COOKIE_SECURE`, `TRUSTED_PROXY_HEADER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Audit | `AUDIT_CLEANUP_CRON`, `AUDIT_RETENTION_DAYS` |
| Email | `GMAIL_APP_PASSWORD`, `CONTACT_EMAIL`, `APP_BASE_URL` |

---

### 4.8 .env.development

**Path:** `.env.development`
**Purpose:** The actual development environment file with filled-in values. Created by copying `.env.example` and filling in secrets/credentials. This file is **gitignored** and should never be committed.

**Differences from `.env.example`:**
- Contains real generated passwords for Postgres, Valkey, and MinIO (generated via `openssl rand -base64 32`)
- Contains a real `GEMINI_API_KEY` for Google AI Studio
- Contains real Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Contains a real `GMAIL_APP_PASSWORD` and `CONTACT_EMAIL` for SMTP
- Sets `AUTH_COOKIE_SECURE=false` explicitly (development over HTTP)
- Sets `AUTH_POST_LOGIN_REDIRECT_URL="http://localhost:5173/dashboard"` (redirects to SvelteKit dev server after Google OAuth)
- Uses MinIO root credentials as S3 access keys for local development (`S3_ACCESS_KEY_ID` = `MINIO_ROOT_USER`)
- Sets `S3_BUCKET="images"` and `MINIO_BUCKET="images"`

**How it's loaded:** The `config.Load()` function calls `godotenv.Load(".env.development", ".env")` when `ENV != "production"`. Variables are loaded in order; the first file to define a variable wins.

**Security note:** This file contains secrets and should remain in `.gitignore`. If accidentally committed, all secrets (API keys, passwords, OAuth credentials, Gmail app password) should be rotated immediately.

---

### 4.9 .gitignore

**Path:** `.gitignore`
**Purpose:** Specifies files Git should not track.

**Ignored:**
- `tmp/`, `dist/` (build artifacts)
- `docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`, `docs/openapi.json` (generated)
- `assets/static/*` except `.gitkeep` (SvelteKit build output embedded in Go binary)
- All `.env` files except `.env.example`
- `.idea/`, `*.swp`, `*.swo` (IDE files)
- `.DS_Store` (macOS)
- `.genkit/` (Genkit dev data/traces)

---

### 4.10 .vscode/settings.json

**Path:** `.vscode/settings.json`
**Purpose:** VSCode project settings. Only contains a `cSpell.words` list of project-specific terms so the spell checker does not flag them: `allkeys`, `appendonly`, `genkit`, `godotenv`, `googleai`, `googlegenai`, `healthcheck`, `INITDB`, `isready`, `joho`, `jsonschema`, `maxmemory`, `sqlc`, `valkey`.

---

### 4.11 .claude/settings.local.json

**Path:** `.claude/settings.local.json`
**Purpose:** Local settings for Claude Code (Anthropic's CLI tool). Configures which tool permissions are automatically allowed in this project.

**Contents:**
- `permissions.allow` - A list of Bash commands that Claude Code is pre-approved to run without asking:
  - `Bash(grep:*)` - Allows running grep commands
  - `Bash(tr:*)` - Allows running tr (translate) commands

This file is specific to the developer's local Claude Code setup and does not affect the application itself.

---

### 4.12 README.md

**Path:** `README.md`
**Purpose:** Project overview, setup instructions, and development guide. Covers tech stack, requirements, setup steps, development commands, production configuration notes (cookie names, security headers, HTTPS requirements).

---

## 5. Entry Point - cmd/server/main.go

**Path:** `cmd/server/main.go`
**Package:** `main`
**Purpose:** The application entry point. Wires together all dependencies and starts the HTTP server.

**Swagger annotations at the top:**
```
@title           API
@version         1.0
@description     API server
@BasePath  /api
```
These are read by `swag init` to generate the OpenAPI spec.

### Function: `main()`

**Execution order:**

1. **Create background context:** `ctx := context.Background()`

2. **Load configuration:** `cfg := config.Load()` - reads all env vars (see Section 6)

3. **Initialize Genkit:**
   ```
   g := genkit.Init(ctx,
       genkit.WithPlugins(&googlegenai.GoogleAI{}),
       genkit.WithDefaultModel("googleai/gemini-2.5-flash"),
   )
   ```
   - Registers the Google AI plugin (reads `GEMINI_API_KEY` from environment)
   - Sets the default model to Gemini 2.5 Flash

4. **Create recipe service chain:**
   - `recipeGenerator := airecipes.NewGenkitGenerator(g)` - creates the AI adapter
   - `recipeService := apprecipes.NewService(recipeGenerator)` - wraps it in the application service

5. **Connect to PostgreSQL:**
   - `store, err := storage.New(ctx, cfg.Database)` - creates connection pool, pings DB, verifies migrations
   - Fatal on error. Defers `store.Close()`.

6. **Connect to MinIO/S3:**
   - `blobClient, err := blob.New(ctx, blob.Config{...})` - creates S3 client
   - On error: logs warning and sets `blobClient = nil` (avatar features gracefully degrade)

7. **Set up audit cleanup cron job:**
   - `auditCleanup := service.NewAuditCleanupService(store.Queries)`
   - `cronScheduler := cron.New()`
   - If `cfg.Audit.CleanupCron` is set and `cfg.Audit.RetentionDays > 0`:
     - Registers a cron function that runs `auditCleanup.PurgeBefore(ctx, cutoff)` with a 5-minute timeout
     - Starts the scheduler; defers `cronScheduler.Stop()`
   - Otherwise logs that the cleanup job is disabled

8. **Create and start HTTP server:**
   - `mux := api.NewRouter(cfg, store, recipeService, blobClient)` - registers all routes
   - Wraps `mux` in `api.WithSecurityHeaders(cfg, mux)` - adds security headers to every response
   - Starts listening via `server.Start(ctx, "127.0.0.1:"+cfg.Port, root)` (Genkit's server module, which also exposes the Genkit dev UI in development)

---

## 6. Configuration - internal/config/

**Path:** `internal/config/config.go`
**Package:** `config`
**Purpose:** Loads all application configuration from environment variables with sensible defaults.

### Structs

#### `Config`
Top-level configuration container. Fields:

| Field | Type | Description |
|---|---|---|
| `Port` | `string` | Server port (default `"3400"`) |
| `Env` | `string` | Environment: `"development"` or `"production"` |
| `Database` | `DatabaseConfig` | PostgreSQL settings |
| `Valkey` | `ValkeyConfig` | Valkey/Redis settings |
| `RateLimit` | `RateLimitConfig` | Rate limiting rules |
| `Auth` | `AuthConfig` | Authentication/cookie settings |
| `Google` | `GoogleOAuthConfig` | Google OAuth credentials |
| `Audit` | `AuditConfig` | Audit log cleanup settings |
| `Email` | `EmailConfig` | Email/SMTP settings |
| `Storage` | `StorageConfig` | S3/MinIO settings |

#### `DatabaseConfig`
| Field | Type | Default |
|---|---|---|
| `Host` | `string` | `"localhost"` |
| `Port` | `string` | `"5432"` |
| `User` | `string` | `"app"` |
| `Password` | `string` | (none) |
| `Database` | `string` | `"app"` |
| `SSLMode` | `string` | `"disable"` |

**Method:** `ConnectionString() string` - Builds a `postgres://user:pass@host:port/db?sslmode=X` URL using `net/url` for proper encoding.

#### `ValkeyConfig`
| Field | Type | Default |
|---|---|---|
| `Host` | `string` | `"localhost"` |
| `Port` | `string` | `"6379"` |
| `Password` | `string` | (none) |

**Method:** `Addr() string` - Returns `"host:port"` for the Redis client.

#### `RateLimitRule`
| Field | Type | Description |
|---|---|---|
| `Limit` | `int` | Max requests allowed in the window |
| `Window` | `time.Duration` | Sliding window duration |

#### `RateLimitConfig`
| Field | Type | Default |
|---|---|---|
| `Enabled` | `bool` | `true` |
| `Register` | `RateLimitRule` | 3 requests / 3600s (1 hour) |
| `Login` | `RateLimitRule` | 5 requests / 900s (15 min) |
| `Password` | `RateLimitRule` | 5 requests / 900s (15 min) |
| `VerifyEmailResend` | `RateLimitRule` | 3 requests / 3600s (1 hour) |
| `Google` | `RateLimitRule` | 10 requests / 900s (15 min) |
| `Logout` | `RateLimitRule` | 10 requests / 60s (1 min) |

#### `AuthConfig`
| Field | Type | Default (dev) | Default (prod) |
|---|---|---|---|
| `CookieName` | `string` | `"session"` | `"__Host-session"` |
| `CookieSecure` | `bool` | `false` | `true` |
| `CookieSameSite` | `http.SameSite` | `Lax` | `Strict` |
| `SessionMaxAge` | `time.Duration` | 7 days | 7 days |
| `IdleTimeout` | `time.Duration` | 30 minutes | 30 minutes |
| `PostLoginRedirectURL` | `string` | (from env) | (from env) |
| `TrustedProxyHeader` | `string` | `""` (disabled) | `""` (disabled) |

The `__Host-` cookie prefix is a browser security feature that requires `Secure`, `Path=/`, and no `Domain` attribute.

#### `GoogleOAuthConfig`
| Field | Type |
|---|---|
| `ClientID` | `string` |
| `ClientSecret` | `string` |
| `RedirectURI` | `string` |

#### `AuditConfig`
| Field | Type | Default |
|---|---|---|
| `CleanupCron` | `string` | `"0 3 * * *"` (3 AM daily) |
| `RetentionDays` | `int` | `90` |

#### `EmailConfig`
| Field | Type |
|---|---|
| `AppBaseURL` | `string` |
| `ContactEmail` | `string` |
| `GmailAppPassword` | `string` |

#### `StorageConfig`
| Field | Type | Default |
|---|---|---|
| `Endpoint` | `string` | (from env) |
| `Region` | `string` | `"us-east-1"` |
| `Bucket` | `string` | (from env) |
| `AccessKeyID` | `string` | (from env) |
| `SecretAccessKey` | `string` | (from env) |
| `ForcePathStyle` | `bool` | `true` |
| `PresignUploadTTL` | `time.Duration` | 900s (15 min) |
| `PresignDownloadTTL` | `time.Duration` | 600s (10 min) |
| `AvatarMaxBytes` | `int64` | 5 MB |

### Function: `Load() *Config`

1. Reads `ENV` to determine environment (default: `"development"`)
2. Loads `.env.development` or `.env.production` via `godotenv`
3. Builds all config structs from environment variables with defaults
4. In production: changes cookie name to `__Host-session`, enables `Secure`, sets `SameSite=Strict`
5. Allows `AUTH_COOKIE_SECURE` to override; if set to `false`, falls back cookie name from `__Host-session` to `session`

### Helper functions

| Function | Purpose |
|---|---|
| `getEnvOrDefault(key, default)` | Returns env var or default if empty |
| `getEnvBool(key)` | Parses env var as bool; returns `(value, ok)` |
| `getEnvBoolOrDefault(key, default)` | Parses env var as bool with fallback |
| `getEnvIntOrDefault(key, default)` | Parses env var as int with fallback |

---

## 7. Domain Layer - internal/domain/

### 7.1 auth.go

**Path:** `internal/domain/auth.go`
**Package:** `domain`
**Purpose:** Pure business logic for authentication: password hashing with Argon2id, email normalization, password validation.

#### Constants

| Constant | Value | Purpose |
|---|---|---|
| `passwordMinLength` | `8` | Minimum password length |
| `passwordMaxLength` | `1000` | Maximum password length (prevents DoS via very long passwords) |
| `argon2Memory` | `64 * 1024` (64 MB) | Argon2id memory cost |
| `argon2Iterations` | `3` | Argon2id time cost (iterations) |
| `argon2Parallelism` | `4` | Argon2id parallelism (threads) |
| `argon2SaltLength` | `16` | Random salt size in bytes |
| `argon2KeyLength` | `32` | Output hash size in bytes |

#### Errors

| Error | Meaning |
|---|---|
| `ErrInvalidEmail` | Email failed validation |
| `ErrInvalidPassword` | Password hash is malformed (used during verification) |

#### Functions

**`NormalizeEmail(value string) (string, error)`**
- Trims whitespace, lowercases
- Rejects empty or >255 chars
- Validates using `net/mail.ParseAddress`
- **Used by:** `api.HandleRegister`, `api.HandleLogin`, `api.HandleGoogleCallback`

**`ValidatePassword(value string) error`**
- Checks length (8-1000 chars)
- Requires at least one uppercase letter
- Requires at least one number
- Requires at least one special character (anything not a-z, A-Z, 0-9)
- Rejects common passwords (see `commonPasswords` map)
- Returns a descriptive error message for the first failing rule
- **Used by:** `api.HandleRegister`, `api.HandleChangePassword`

**`HashPassword(password string) (string, error)`**
- Generates 16-byte random salt using `crypto/rand`
- Runs Argon2id with the configured parameters
- Returns an encoded string in the format: `$argon2id$v=19$m=65536,t=3,p=4$<base64-salt>$<base64-hash>`
- **Used by:** `api.HandleRegister`, `api.HandleChangePassword`

**`VerifyPassword(password, encoded string) (bool, error)`**
- Parses the encoded hash string to extract parameters, salt, and hash
- Recomputes Argon2id with the same parameters and salt
- Uses `crypto/subtle.ConstantTimeCompare` to prevent timing attacks
- Returns `true` if match, `false` if mismatch, `error` if the hash format is invalid
- **Used by:** `api.HandleLogin`, `api.HandleChangePassword`

**`FakePasswordHash(password string)`**
- Performs a full Argon2id hash computation but discards the result
- **Purpose:** Timing attack prevention. When a login attempt targets a non-existent user or an OAuth-only user, this function is called so the response time is similar to a real password verification. This prevents attackers from enumerating valid emails by measuring response times.
- **Used by:** `api.HandleLogin` (when user not found or provider is not `"credentials"`)

**`decodeArgon2idHash(encoded string) (argon2Params, []byte, []byte, error)`**
- Internal function that parses the `$argon2id$v=19$m=X,t=Y,p=Z$salt$hash` format
- Validates version is 19, all parameters are positive integers
- Returns the params struct, salt bytes, and hash bytes

**`parseArgon2Param(input, label string) (int, error)`**
- Internal helper that parses `"m=65536"` format into the integer value

**Character check helpers:** `hasUppercase`, `hasNumber`, `hasSpecial` - iterate runes to check password requirements.

**`isCommonPassword(value string) bool`** - Lowercases the input and checks against the `commonPasswords` map.

**`commonPasswords`** - A `map[string]struct{}` containing ~55 common passwords (stored lowercase) that meet complexity requirements but are still easily guessable (e.g., `"password1!"`, `"welcome123!"`, `"admin2025!"`).

#### Internal struct: `argon2Params`
| Field | Type |
|---|---|
| `memory` | `uint32` |
| `iterations` | `uint32` |
| `parallelism` | `uint8` |

---

### 7.2 session.go

**Path:** `internal/domain/session.go`
**Package:** `domain`
**Purpose:** Server-side session management - creation, validation, revocation, and enforcement of session limits.

#### Errors

| Error | Meaning |
|---|---|
| `ErrSessionNotFound` | No session exists for the given token |
| `ErrSessionExpired` | Session exists but has expired (absolute or idle timeout) |

#### Structs

**`SessionUser`** - User data attached to a validated session:
| Field | Type | Description |
|---|---|---|
| `ID` | `string` | User UUID as string |
| `Email` | `string` | User email |
| `EmailVerified` | `bool` | Whether email is verified |
| `Name` | `string` | Display name |
| `Picture` | `*string` | Avatar URL or S3 key (nil if none) |
| `Provider` | `string` | `"credentials"` or `"google"` |

**`SessionInfo`** - Full session metadata:
| Field | Type | Description |
|---|---|---|
| `ID` | `pgtype.UUID` | Session UUID |
| `TokenHash` | `string` | SHA-256 hash of the session token |
| `ExpiresAt` | `time.Time` | Absolute expiration |
| `LastActiveAt` | `time.Time` | Last activity timestamp |
| `User` | `SessionUser` | The user who owns this session |

**`SessionService`** - Manages session lifecycle:
| Field | Type | Description |
|---|---|---|
| `queries` | `*db.Queries` | Database query interface |
| `sessionMaxAge` | `time.Duration` | Absolute session lifetime (default 7 days) |
| `idleTimeout` | `time.Duration` | Max time between requests (default 30 min) |

#### Functions

**`NewSessionService(queries, sessionMaxAge, idleTimeout) *SessionService`**
- Constructor. Called from `api.NewAuthHandler`.

**`(s *SessionService) CreateSession(ctx, userID, ipAddress, userAgent) (string, db.Session, error)`**
1. Calls `enforceSessionLimit(ctx, userID, 5)` to ensure max 5 concurrent sessions
2. Generates a 32-byte random token using `generateToken(32)`
3. Hashes the token with SHA-256
4. Inserts a new session row via `queries.CreateSession` with expiration = now + sessionMaxAge
5. Calls `enforceSessionLimit` again (race condition protection)
6. Returns the raw token (for the cookie), the session row, and any error
- **Used by:** `api.HandleRegister`, `api.HandleLogin`, `api.HandleGoogleCallback`, `api.HandleChangePassword`

**`(s *SessionService) ValidateToken(ctx, token) (*SessionInfo, error)`**
1. Returns `ErrSessionNotFound` if token is empty
2. Hashes the token and looks up the session via `queries.GetSessionByTokenHash`
3. Returns `ErrSessionNotFound` if no row found
4. Checks idle timeout: if `lastActiveAt + idleTimeout < now`, deletes the session and returns `ErrSessionExpired`
5. Checks absolute expiration: if `expiresAt < now`, deletes the session and returns `ErrSessionExpired`
6. Updates `last_active_at` to now via `queries.UpdateSessionLastActive`
7. Returns `SessionInfo` with user data from the JOIN query
- **Used by:** `api.AuthHandler.RequireAuth` middleware

**`(s *SessionService) RevokeByTokenHash(ctx, tokenHash) error`**
- Deletes a single session by its token hash
- **Used by:** `api.HandleLogout`, `api.revokeExistingSession`

**`(s *SessionService) RevokeUserSessions(ctx, userID) error`**
- Deletes ALL sessions for a user
- **Used by:** `api.HandleChangePassword` (force re-login on all devices)

**`(s *SessionService) enforceSessionLimit(ctx, userID, limit) error`**
- Loops: counts sessions for user, if >= limit, deletes the oldest session
- Ensures a user never has more than `limit` (5) concurrent sessions
- Uses a loop (not just one deletion) to handle race conditions

**`HashToken(token string) string`**
- SHA-256 hashes a token and returns the hex-encoded string
- The raw token is stored in the cookie; only the hash is stored in the database
- **Used by:** `CreateSession`, `ValidateToken`, `RevokeByTokenHash`, email verification

**`generateToken(size int) (string, error)`**
- Generates `size` random bytes using `crypto/rand` and returns base64url-encoded string
- **Used by:** `CreateSession`

**Helper functions:**
- `uuidToString(pgtype.UUID) string` - Converts pgtype UUID to string
- `textToPointer(pgtype.Text) *string` - Converts nullable text to Go pointer

---

## 8. API Layer - internal/api/

### 8.1 router.go

**Path:** `internal/api/router.go`
**Package:** `api`
**Purpose:** Creates the HTTP router and registers all routes.

#### Function: `NewRouter(cfg, store, recipeService, blobClient) *http.ServeMux`

**Setup steps:**
1. Creates `http.ServeMux`
2. Creates a `RateLimiter` (Valkey-backed) if rate limiting is enabled; `nil` otherwise
3. Creates a `GmailMailer` if credentials are provided; `nil` otherwise
4. Creates `AuthHandler` and `AvatarHandler` with all dependencies
5. Registers routes (see below)
6. Returns the mux

**Route table:**

| Method | Path | Handler | Auth Required | Rate Limited |
|---|---|---|---|---|
| GET | `/api/health` | `handleHealth` | No | No |
| POST | `/api/recipes/generate` | `makeRecipeHandler` | Yes | No |
| POST | `/api/auth/register` | `HandleRegister` | No | Yes (register) |
| POST | `/api/auth/login` | `HandleLogin` | No | Yes (login) |
| GET | `/api/auth/google` | `HandleGoogleLogin` | No | Yes (google) |
| GET | `/api/auth/google/callback` | `HandleGoogleCallback` | No | No |
| GET | `/api/auth/verify-email` | `HandleVerifyEmail` | No | No |
| GET | `/api/auth/me` | `HandleMe` | Yes | No |
| GET | `/api/auth/avatar-url` | `HandleAvatarURL` | Yes | No |
| POST | `/api/auth/avatar/upload-url` | `HandleAvatarUploadURL` | Yes | No |
| POST | `/api/auth/avatar/confirm` | `HandleAvatarConfirm` | Yes | No |
| POST | `/api/auth/logout` | `HandleLogout` | Yes | Yes (logout) |
| POST | `/api/auth/password` | `HandleChangePassword` | Yes | Yes (password) |
| POST | `/api/auth/verify-email/resend` | `HandleResendVerification` | Yes | Yes (verify-email) |
| GET | `/api/openapi.json` | `handleOpenAPISpec` | No | No | Dev only |
| GET | `/api/docs` | `handleScalarDocs` | No | No | Dev only |
| GET | `/api/docs/scalar.js` | `handleScalarScript` | No | No | Dev only |
| * | `/` (catch-all) | `staticHandler` | No | No |

Routes protected by `authHandler.RequireAuth(...)` wrap the handler in auth middleware that validates the session cookie and injects user/session into context.

---

### 8.2 auth.go

**Path:** `internal/api/auth.go`
**Package:** `api`
**Purpose:** The largest file in the project. Contains all authentication-related HTTP handlers, OAuth flow, email verification, and many utility functions.

#### Context keys (constants)

| Key | Type | Stores |
|---|---|---|
| `contextKeyUser` | `contextKey("authUser")` | `domain.SessionUser` |
| `contextKeySession` | `contextKey("authSession")` | `*domain.SessionInfo` |

#### OAuth cookie constants

| Constant | Value | Purpose |
|---|---|---|
| `oauthStateCookieName` | `"oauth_state"` | CSRF state parameter for Google OAuth |
| `oauthVerifierCookieName` | `"oauth_verifier"` | PKCE code verifier for Google OAuth |
| `oauthCookieMaxAge` | `5 * time.Minute` | OAuth cookies expire in 5 minutes |

#### Email verification constants

| Constant | Value |
|---|---|
| `emailVerificationTokenSize` | `32` bytes |
| `emailVerificationTTL` | `24 * time.Hour` |

#### Struct: `AuthHandler`
| Field | Type | Description |
|---|---|---|
| `queries` | `*db.Queries` | Database queries |
| `sessions` | `*domain.SessionService` | Session manager |
| `cookies` | `CookieManager` | Cookie helper |
| `oauthConfig` | `*oauth2.Config` | Google OAuth config (nil if not configured) |
| `rateLimiter` | `RateLimiter` | Rate limiter (nil if disabled) |
| `rateLimits` | `config.RateLimitConfig` | Rate limit rules |
| `auditLogger` | `*AuditLogger` | Audit log writer |
| `postLoginRedirectURL` | `string` | Where to redirect after Google OAuth (validated against `appBaseURL` at startup) |
| `mailer` | `email.Mailer` | Email sender (nil if not configured) |
| `appBaseURL` | `string` | Base URL for email links |
| `trustedProxyHeader` | `string` | Header name for client IP behind a reverse proxy (e.g., `X-Forwarded-For`) |

#### Interface: `RateLimiter`
```go
type RateLimiter interface {
    Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error)
}
```
Implemented by `ratelimit.ValkeyLimiter`. Used throughout auth handlers.

#### Request/Response types

| Type | Fields | Used by |
|---|---|---|
| `RegisterRequest` | `Email`, `Password`, `Name` | `HandleRegister` |
| `LoginRequest` | `Email`, `Password` | `HandleLogin` |
| `ChangePasswordRequest` | `CurrentPassword`, `NewPassword` | `HandleChangePassword` |
| `AuthMeResponse` | `ID`, `Email`, `EmailVerified`, `Name`, `Picture`, `Provider` | `HandleMe` |
| `AuthStatusResponse` | `Status` ("ok") | Multiple handlers |
| `LogoutResponse` | `Status` ("ok") | `HandleLogout` |
| `googleUserInfo` | `Sub`, `Email`, `EmailVerified`, `Name`, `Picture` | `HandleGoogleCallback` |

#### Constructor: `NewAuthHandler(store, cfg, googleCfg, emailCfg, rateLimitCfg, limiter, mailer) *AuthHandler`
- Creates OAuth config with Google endpoints and scopes (`openid`, `email`, `profile`) if credentials are provided
- Creates SessionService with max age and idle timeout from config
- Creates CookieManager and AuditLogger

#### Handler: `RequireAuth(next http.Handler) http.Handler`
**Purpose:** Authentication middleware. Wraps protected routes.

**Flow:**
1. Reads session cookie by name
2. If missing/empty: clears cookie, returns 401
3. Calls `sessions.ValidateToken(token)` to verify the session
4. If session not found or expired: clears cookie, returns 401
5. Stores `SessionInfo` and `SessionUser` in request context
6. Calls `next.ServeHTTP`

#### Handler: `HandleMe(w, r)`
- Extracts user from context via `userFromContext`
- Returns `AuthMeResponse` as JSON

#### Handler: `HandleLogout(w, r)`
1. Gets session from context
2. Rate limits by `"logout:" + tokenHash`
3. Revokes the session via `sessions.RevokeByTokenHash`
4. Clears the session cookie
5. Audit logs both `"session_revoked"` and `"logout"` events

#### Handler: `HandleRegister(w, r)`
1. Rate limits by `"register"` key
2. Decodes `RegisterRequest` from JSON body
3. Normalizes email via `domain.NormalizeEmail`
4. Validates name (non-empty, max 255 chars)
5. Validates password via `domain.ValidatePassword`
6. Checks if user already exists (returns 200 OK regardless to prevent email enumeration)
7. Hashes password via `domain.HashPassword`
8. Creates user in DB via `queries.CreateUser`
9. Handles unique violation (race condition) the same as duplicate check
10. Revokes any existing session from the cookie (session rotation)
11. Creates new session
12. Sets session cookie
13. Audit logs `"register_success"`
14. Sends verification email if provider is `"credentials"` and email not verified

**Security note:** Registration always returns `200 OK` regardless of whether the email exists. This prevents email enumeration attacks.

#### Handler: `HandleLogin(w, r)`
1. Decodes `LoginRequest`
2. Normalizes email
3. Rate limits by `"login:" + email`
4. Rejects passwords > 1000 chars
5. Looks up user by email:
   - Not found: calls `FakePasswordHash` (timing attack prevention), audit logs `"login_failure"` with reason `"not_found"`, returns 401
6. Checks account lockout: if `locked_until > now`, returns 401
7. If lock expired: calls `UnlockUser` to reset
8. Checks provider is `"credentials"` with valid password hash:
   - Wrong provider: calls `FakePasswordHash`, returns 401
9. Verifies password via `domain.VerifyPassword`:
   - Wrong password: increments `failed_login_attempts`, if >= 10 locks account for 30 minutes, sends lockout email, returns 401
10. Resets failed login attempts
11. Creates session, sets cookie
12. Audit logs `"login_success"`

#### Handler: `HandleChangePassword(w, r)`
1. Gets user from context
2. Rate limits by `"password:" + userID`
3. Decodes `ChangePasswordRequest`
4. Rejects new passwords > 1000 chars
5. Looks up full user record
6. Verifies provider is `"credentials"` with valid hash
7. Verifies current password
8. Validates new password
9. Hashes new password
10. Updates in DB
11. **Revokes ALL user sessions** (forces re-login on all devices)
12. Creates a fresh session for the current device
13. Audit logs `"password_change"`

#### Handler: `HandleVerifyEmail(w, r)`
1. Reads `token` from query string
2. Looks up user by the SHA-256 hash of the token
3. Checks if token has expired
4. Marks email as verified, clears verification token/expiry
5. Returns an HTML page (or JSON if the client wants JSON) with success/error message
6. The HTML response includes a "Continue" link back to the app

**`writeVerificationResponse`** - Helper that returns either JSON or a minimal HTML page depending on the `Accept` header (checked via `wantsJSON`).

#### Handler: `HandleResendVerification(w, r)`
1. Gets user from context
2. Rate limits by `"verify-email-resend:" + userID`
3. Looks up full user record
4. Only works for `"credentials"` provider
5. Calls `sendVerificationEmail` if not already verified
6. Always returns 200 (prevents information leakage)

#### Handler: `HandleGoogleLogin(w, r)`
1. Rate limits by `"google"` key
2. Checks OAuth config is available
3. Generates random `state` (32 bytes) and `verifier` (64 bytes) tokens
4. Computes PKCE code challenge: `SHA-256(verifier)` base64url-encoded
5. Sets `oauth_state` and `oauth_verifier` as HttpOnly cookies on path `/api/auth/google/callback`
6. Builds Google authorization URL with state and PKCE parameters
7. If client wants JSON: returns `{"url": "..."}` for SPA-initiated flows
8. Otherwise: redirects (302) to Google

#### Handler: `HandleGoogleCallback(w, r)`
1. Checks OAuth config
2. Reads `state` and `code` from query string
3. Reads `oauth_state` and `oauth_verifier` cookies
4. Clears both OAuth cookies
5. Constant-time compares `state` parameter with cookie value (CSRF protection)
6. Exchanges auth code for token, passing the PKCE verifier
7. Fetches user info from `https://openidconnect.googleapis.com/v1/userinfo`
8. Validates the response has `sub` and `email`
9. Normalizes email
10. Checks for existing user with same email but different provider/Google ID (prevents account takeover)
11. Upserts user via `queries.UpsertUserByGoogleID` (creates or updates)
12. Revokes existing session (session rotation)
13. Creates new session, sets cookie
14. Audit logs `"oauth_login"`
15. Redirects to `postLoginRedirectURL` or `"/"` (URL is validated against `appBaseURL` at startup to prevent open redirects)

#### Private methods

**`sendVerificationEmail(ctx, user, ip, userAgent)`**
- Generates 32-byte random token
- Stores SHA-256 hash in DB with 24-hour expiry
- Builds verification URL: `{appBaseURL}/api/auth/verify-email?token={token}`
- Sends multipart email (text + HTML) with verification link
- Audit logs success or failure

**`sendLockoutEmail(ctx, user, lockedUntil, ip, userAgent)`**
- Sends email notifying user their account was locked
- Includes lockout end time and IP address

**`verificationURL(token) string`** - Constructs the full verification URL.

**`allowRequest(ctx, key, r, rule) bool`**
- Rate limiting wrapper. Builds a compound key: `{key}:{ip}`. Returns `true` (allows) if limiter is nil or rate limiting is disabled. Returns `false` (denies) on limiter errors (fail-closed).

**`revokeExistingSession(r) bool`**
- Reads session cookie, revokes that session. Used during login/register for session rotation.

#### Utility functions

**`userFromContext(ctx) (SessionUser, bool)`** - Extracts user from context.
**`sessionFromContext(ctx) (*SessionInfo, bool)`** - Extracts session from context.
**`writeJSON(w, status, payload)`** - Sets `Content-Type: application/json`, writes status code, JSON-encodes payload.
**`wantsJSON(r) bool`** - Returns true if `Accept: application/json`, or `Sec-Fetch-Mode: cors`, or `X-Requested-With` header is present.
**`generateRandomToken(size) (string, error)`** - Generates random bytes, base64url-encodes.
**`codeChallenge(verifier) string`** - SHA-256 + base64url for PKCE.
**`setOAuthCookie(w, cookies, name, value)`** - Sets an HttpOnly cookie scoped to `/api/auth/google/callback`.
**`clearOAuthCookie(w, cookies, name)`** - Clears an OAuth cookie by setting `MaxAge: -1`.
**`ipFromRequest(r) *netip.Addr`** - Method on `AuthHandler`. When `TrustedProxyHeader` is configured, reads the first IP from that header (e.g., `X-Forwarded-For`). Falls back to `r.RemoteAddr` if the header is empty or not configured.
**`isUniqueViolation(err) bool`** - Checks if a PostgreSQL error is a unique constraint violation (code `23505`).

---

### 8.3 avatar.go

**Path:** `internal/api/avatar.go`
**Package:** `api`
**Purpose:** Handles avatar (profile picture) upload, confirmation, and retrieval via S3-compatible presigned URLs.

#### Constants

| Constant | Value |
|---|---|
| `avatarMaxBytesDefault` | `5 * 1024 * 1024` (5 MB) |

#### Struct: `AvatarHandler`
| Field | Type | Description |
|---|---|---|
| `queries` | `*db.Queries` | Database access |
| `blob` | `*blob.Client` | S3/MinIO client (nil if storage unavailable) |
| `maxBytes` | `int64` | Max avatar file size |
| `allowList` | `map[string]string` | Allowed MIME types: `"image/jpeg"` -> `"jpg"`, `"image/png"` -> `"png"`, `"image/webp"` -> `"webp"` |

#### Request/Response types

| Type | Fields | Used by |
|---|---|---|
| `AvatarUploadURLRequest` | `ContentType`, `Size` | `HandleAvatarUploadURL` |
| `AvatarUploadURLResponse` | `Key`, `URL`, `Method`, `Headers`, `ExpiresAt` | `HandleAvatarUploadURL` |
| `AvatarConfirmRequest` | `Key` | `HandleAvatarConfirm` |
| `AvatarURLResponse` | `URL`, `ExpiresAt` | `HandleAvatarConfirm`, `HandleAvatarURL` |

#### Constructor: `NewAvatarHandler(store, blobClient, cfg) *AvatarHandler`
- Sets max bytes from config (or 5MB default)
- Initializes the MIME type allow list

#### Upload flow (3-step presigned URL pattern)

**Step 1: `HandleAvatarUploadURL(w, r)` - Get presigned PUT URL**
1. Checks blob client is available (503 if not)
2. Gets user from context
3. Decodes `AvatarUploadURLRequest`
4. Validates content type against allow list
5. Validates file size (> 0 and <= maxBytes)
6. Constructs object key: `users/{userID}/avatar.{ext}`
7. Calls `blob.PresignPutObject(key, contentType)` to get presigned URL
8. Returns the URL, key, method, headers, and expiry
9. **The client then uploads directly to MinIO using this presigned URL**

**Step 2: Client uploads file directly to MinIO using the presigned PUT URL**

**Step 3: `HandleAvatarConfirm(w, r)` - Confirm upload**
1. Checks blob client
2. Gets user from context
3. Decodes `AvatarConfirmRequest` (contains the key)
4. Validates key starts with `users/{userID}/avatar.` and has allowed extension
5. Calls `blob.HeadObject(key)` to verify the file actually exists in storage
6. Gets current user record to check for old avatar
7. Updates user's `picture` field to the new key
8. If user had a previous avatar key (not a URL, not the same key), deletes the old object from storage
9. Generates a presigned GET URL for the new avatar
10. Returns the download URL

#### Handler: `HandleAvatarURL(w, r)` - Get current avatar URL
1. Gets user from context
2. Looks up user record
3. If no picture: returns `{url: null}`
4. If picture starts with `http://` or `https://` (Google avatar): returns it directly
5. Otherwise (S3 key): generates presigned GET URL and returns it with expiry

#### Helper functions

**`shouldDeleteAvatarKey(value, prefix) bool`** - Returns true if the key looks like an S3 key (not a URL) under the user's avatar prefix.

**`(h *AvatarHandler) isAllowedAvatarKey(key, prefix) bool`** - Validates that a key matches `{prefix}avatar.{allowed_ext}`.

---

### 8.4 recipes.go

**Path:** `internal/api/recipes.go`
**Package:** `api`
**Purpose:** HTTP handler for AI-powered recipe generation.

#### Types (mirrors of `app/recipes` types for Swagger)

| Type | Fields |
|---|---|
| `RecipeRequest` | `Ingredient` (required), `DietaryRestrictions` (optional) |
| `Recipe` | `Title`, `Description`, `PrepTime`, `CookTime`, `Servings`, `Ingredients`, `Instructions`, `Tips` |

#### Function: `makeRecipeHandler(service) http.HandlerFunc`
- Returns a closure that:
  1. Decodes JSON body with `DisallowUnknownFields()` (rejects extra fields)
  2. Validates `Ingredient` is not empty
  3. Checks for trailing JSON data (rejects multiple JSON objects in body)
  4. Calls `service.Generate(ctx, request)`
  5. Maps the domain `Recipe` to the API `Recipe` type
  6. Returns JSON response

---

### 8.5 cookies.go

**Path:** `internal/api/cookies.go`
**Package:** `api`
**Purpose:** Manages session cookie creation and deletion.

#### Struct: `CookieManager`
| Field | Type | Description |
|---|---|---|
| `name` | `string` | Cookie name (`"session"` or `"__Host-session"`) |
| `secure` | `bool` | Whether to set the `Secure` flag |
| `sameSite` | `http.SameSite` | `Lax` (dev) or `Strict` (prod) |
| `maxAge` | `time.Duration` | Cookie max age (7 days) |

#### Functions

**`NewCookieManager(cfg) CookieManager`** - Constructor from `AuthConfig`.

**`SetSessionCookie(w, token)`** - Sets a cookie with:
- `Path=/`
- `HttpOnly=true`
- `Secure` from config
- `SameSite` from config
- `MaxAge` from config (7 days in seconds)

**`ClearSessionCookie(w)`** - Clears the cookie by setting `MaxAge=-1` and `Value=""`.

---

### 8.6 audit.go

**Path:** `internal/api/audit.go`
**Package:** `api`
**Purpose:** Audit logging helper and utility functions.

#### Struct: `AuditLogger`
| Field | Type |
|---|---|
| `queries` | `*db.Queries` |

#### Functions

**`NewAuditLogger(queries) *AuditLogger`** - Constructor.

**`(l *AuditLogger) Log(ctx, event, userID, ip, userAgent, metadata)`**
- Nil-safe (no-op if logger or queries is nil)
- JSON-marshals the metadata map
- Calls `queries.CreateAuditLog` with all fields
- Errors are silently ignored (audit logging should never break the request)

**Audit event types used throughout the codebase:**
| Event | When logged |
|---|---|
| `register_success` | User successfully registered |
| `register_duplicate` | Registration attempt with existing email |
| `login_success` | Successful login |
| `login_failure` | Failed login (with reasons: `not_found`, `locked`, `invalid_provider`, `invalid_password`) |
| `account_lockout` | Account locked after 10 failed attempts |
| `session_revoked` | Session revoked (with reasons: `logout`, `rotation`, `password_change`) |
| `logout` | User logged out |
| `password_change` | Password changed successfully |
| `password_change_failure` | Failed password change (with reasons) |
| `oauth_login` | Successful Google OAuth login |
| `oauth_login_failure` | Failed OAuth (email conflict) |
| `email_verified` | Email successfully verified |
| `email_verification_sent` | Verification email sent |
| `email_verification_token_failed` | Failed to generate/store verification token |
| `email_send_failed` | Email sending failed |

**`hashEmail(email) string`** - SHA-256 hashes an email for privacy-safe audit logging.

**`uuidFromString(value) pgtype.UUID`** - Parses a UUID string into pgtype format.

---

### 8.7 middleware.go

**Path:** `internal/api/middleware.go`
**Package:** `api`
**Purpose:** Placeholder file for future middleware. Currently contains only a comment. The actual auth middleware is in `auth.go` (`RequireAuth`).

---

### 8.8 health.go

**Path:** `internal/api/health.go`
**Package:** `api`
**Purpose:** Simple health check endpoint.

#### Type: `HealthResponse`
| Field | Type | Example |
|---|---|---|
| `Status` | `string` | `"ok"` |

#### Function: `handleHealth(w, r)`
- Returns `{"status": "ok"}` with 200 status
- Has Swagger annotations for documentation generation

---

### 8.9 security.go

**Path:** `internal/api/security.go`
**Package:** `api`
**Purpose:** HTTP middleware that adds security headers to every response.

#### Function: `WithSecurityHeaders(cfg, next) http.Handler`

Sets the following headers on every response:

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` (prevents clickjacking) |
| `Content-Security-Policy` | Restrictive CSP: `default-src 'self'`; no iframes, no objects, images from self/data/https, scripts/styles/fonts from self only |
| `X-Content-Type-Options` | `nosniff` (prevents MIME sniffing) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, geolocation |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (**production only**) |

This middleware wraps the entire router in `main.go`.

---

### 8.10 docs.go

**Path:** `internal/api/docs.go`
**Package:** `api`
**Purpose:** Serves the OpenAPI specification and Scalar API documentation UI (development only).

#### Constants

| Constant | Value |
|---|---|
| `scalarScriptURL` | `https://cdn.jsdelivr.net/npm/@scalar/api-reference` |
| `docsCSP` | Relaxed CSP for docs page (allows `unsafe-inline` styles for Scalar) |

#### Package-level variables

| Variable | Type | Purpose |
|---|---|---|
| `scalarScriptMu` | `sync.Mutex` | Protects concurrent access to cached script |
| `scalarScript` | `[]byte` | Cached Scalar JS bundle |

#### Functions

**`handleOpenAPISpec(w, r)`**
- Serves `docs/swagger.json` (or `docs/openapi.json` as fallback)
- Sets `Access-Control-Allow-Origin: *` for CORS

**`handleScalarDocs(w, r)`**
- Builds the OpenAPI spec URL dynamically from the request (respects `X-Forwarded-Proto`)
- Uses the Scalar Go library to render an HTML page with the API reference UI
- Sets a relaxed CSP for the docs page
- Points the CDN to the local `/api/docs/scalar.js` endpoint

**`buildSpecURL(r) string`**
- Determines the scheme (http/https) from TLS and `X-Forwarded-Proto` header
- Returns `{scheme}://{host}/api/openapi.json`

**`handleScalarScript(w, r)`**
- Serves the Scalar JS bundle, fetching it from CDN on first request and caching it in memory
- Thread-safe via mutex

**`fetchScalarScript() ([]byte, error)`**
- Downloads the Scalar JS bundle from CDN with a 10-second timeout

---

### 8.11 static.go

**Path:** `internal/api/static.go`
**Package:** `api`
**Purpose:** Serves the SvelteKit frontend in production; returns 404 in development.

#### Function: `staticHandler(cfg) http.Handler`

**Development mode:**
- Returns a handler that always responds with 404 and "In development mode, use SvelteKit dev server"
- In development, the SvelteKit dev server (port 5173) serves the frontend directly

**Production mode:**
- Uses Go's `embed.FS` to serve the pre-built SvelteKit files from `assets/static/`
- Reads `index.html` into memory at startup
- For any request:
  - If the path matches an actual static file: serves that file
  - Otherwise: serves `index.html` (SPA fallback)
- This allows client-side routing to work (any route like `/dashboard` still gets `index.html`)

---

### 8.12 scalar.html

**Path:** `internal/api/scalar.html`
**Purpose:** A static HTML template for the Scalar API documentation viewer. Contains a `<script>` tag pointing to the OpenAPI spec URL and the Scalar JS bundle. This appears to be a standalone file not directly served by the Go code (the Go code uses the Scalar Go library to generate HTML dynamically in `docs.go`).

---

## 9. Storage Layer - internal/storage/

### 9.1 store.go

**Path:** `internal/storage/store.go`
**Package:** `storage`
**Purpose:** Creates and manages the PostgreSQL connection pool. Verifies that migrations have been applied.

#### Struct: `Store`
| Field | Type | Description |
|---|---|---|
| `pool` | `*pgxpool.Pool` | Connection pool |
| `Queries` | `*db.Queries` | sqlc-generated query interface |

#### Functions

**`New(ctx, cfg) (*Store, error)`**
1. Creates a pgx connection pool using `cfg.ConnectionString()`
2. Pings the database to verify connectivity
3. Calls `ensureMigrationsApplied` to verify migrations
4. Creates `db.Queries` from the pool
5. Returns the Store

**`ensureMigrationsApplied(ctx, pool) error`**
- Checks if the `goose_db_version` table exists in `information_schema.tables`
- If it doesn't exist: returns error telling user to run `make migrate-up`
- If it exists but has 0 rows: returns error
- Can be skipped by setting `SKIP_MIGRATION_CHECK=true`

**`skipMigrationCheck() bool`** - Reads and parses `SKIP_MIGRATION_CHECK` env var.

**`(s *Store) Close()`** - Closes the connection pool.

**`(s *Store) Pool() *pgxpool.Pool`** - Returns the raw pool (not currently used but available).

---

### 9.2 queries.sql

**Path:** `internal/storage/queries.sql`
**Purpose:** SQL query definitions for sqlc. This is the **source of truth** for all database queries. Running `sqlc generate` reads this file and generates Go code.

**Query naming convention:** `-- name: FunctionName :one/:many/:exec`
- `:one` - returns a single row
- `:many` - returns multiple rows
- `:exec` - returns no rows (INSERT/UPDATE/DELETE without RETURNING)

#### User queries

| Query name | Type | SQL | Purpose |
|---|---|---|---|
| `CreateUser` | `:one` | `INSERT INTO users ... RETURNING *` | Create a new user |
| `GetUserByID` | `:one` | `SELECT ... WHERE id = $1` | Lookup user by UUID |
| `GetUserByEmail` | `:one` | `SELECT ... WHERE email = $1` | Lookup user by email |
| `GetUserByGoogleID` | `:one` | `SELECT ... WHERE google_id = $1` | Lookup user by Google sub ID |
| `UpsertUserByGoogleID` | `:one` | `INSERT ... ON CONFLICT (google_id) DO UPDATE ... RETURNING *` | Create or update Google user |
| `UpdateUser` | `:one` | `UPDATE ... SET name=COALESCE(...)...` | Partial update using COALESCE pattern |
| `SetEmailVerificationToken` | `:exec` | `UPDATE ... SET email_verification_token_hash=$2, ...expires_at=$3` | Store verification token |
| `GetUserByEmailVerificationTokenHash` | `:one` | `SELECT ... WHERE email_verification_token_hash = $1` | Lookup by verification token hash |
| `VerifyUserEmail` | `:one` | `UPDATE ... SET email_verified=TRUE, ...token=NULL, ...expires=NULL` | Mark email verified |
| `UpdateUserPassword` | `:exec` | `UPDATE ... SET password_hash=$2` | Change password |
| `IncrementFailedLoginAttempts` | `:one` | `UPDATE ... SET failed_login_attempts = failed_login_attempts + 1 RETURNING *` | Track failed logins |
| `ResetFailedLoginAttempts` | `:exec` | `UPDATE ... SET failed_login_attempts = 0` | Reset after successful login |
| `LockUser` | `:exec` | `UPDATE ... SET locked_until = $2` | Lock account |
| `UnlockUser` | `:exec` | `UPDATE ... SET locked_until = NULL, failed_login_attempts = 0` | Unlock account |

#### Session queries

| Query name | Type | Purpose |
|---|---|---|
| `CreateSession` | `:one` | Insert new session row |
| `GetSessionByTokenHash` | `:one` | Get session + user data (JOIN) where not expired |
| `UpdateSessionLastActive` | `:exec` | Touch `last_active_at = NOW()` |
| `DeleteSession` | `:exec` | Delete by session ID |
| `DeleteSessionByTokenHash` | `:exec` | Delete by token hash |
| `DeleteUserSessions` | `:exec` | Delete all sessions for a user |
| `CountUserSessions` | `:one` | Count active sessions for a user |
| `GetOldestUserSession` | `:one` | Get oldest session (for eviction) |
| `DeleteExpiredSessions` | `:exec` | Bulk delete expired sessions |

**`GetSessionByTokenHash`** is the most complex query - it JOINs `sessions` with `users` to return session metadata plus user profile fields in a single query.

#### Audit log queries

| Query name | Type | Purpose |
|---|---|---|
| `CreateAuditLog` | `:exec` | Insert a new audit log entry |
| `PurgeAuditLogsBefore` | `:one` | Delete logs older than a timestamp, returns count of deleted rows |

---

### 9.3 db/db.go

**Path:** `internal/storage/db/db.go`
**Generated by:** sqlc v1.30.0

#### Interface: `DBTX`
```go
type DBTX interface {
    Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
    Query(context.Context, string, ...interface{}) (pgx.Rows, error)
    QueryRow(context.Context, string, ...interface{}) pgx.Row
}
```
This is the database abstraction. Both `*pgxpool.Pool` and `pgx.Tx` implement this interface, allowing queries to work with either a connection pool or a transaction.

#### Struct: `Queries`
| Field | Type |
|---|---|
| `db` | `DBTX` |

**`New(db DBTX) *Queries`** - Constructor.

**`(q *Queries) WithTx(tx pgx.Tx) *Queries`** - Returns a new `Queries` that runs against the given transaction.

---

### 9.4 db/models.go

**Path:** `internal/storage/db/models.go`
**Generated by:** sqlc v1.30.0
**Purpose:** Go struct definitions mirroring database tables.

#### Struct: `User`
| Field | Type | JSON | DB Column |
|---|---|---|---|
| `ID` | `pgtype.UUID` | `"id"` | `id` |
| `Email` | `string` | `"email"` | `email` |
| `EmailVerified` | `bool` | `"email_verified"` | `email_verified` |
| `Name` | `string` | `"name"` | `name` |
| `Picture` | `pgtype.Text` | `"picture"` | `picture` |
| `PasswordHash` | `pgtype.Text` | `"password_hash"` | `password_hash` |
| `Provider` | `string` | `"provider"` | `provider` |
| `GoogleID` | `pgtype.Text` | `"google_id"` | `google_id` |
| `EmailVerificationTokenHash` | `pgtype.Text` | `"email_verification_token_hash"` | `email_verification_token_hash` |
| `EmailVerificationExpiresAt` | `pgtype.Timestamptz` | `"email_verification_expires_at"` | `email_verification_expires_at` |
| `FailedLoginAttempts` | `int32` | `"failed_login_attempts"` | `failed_login_attempts` |
| `LockedUntil` | `pgtype.Timestamptz` | `"locked_until"` | `locked_until` |
| `CreatedAt` | `pgtype.Timestamptz` | `"created_at"` | `created_at` |
| `UpdatedAt` | `pgtype.Timestamptz` | `"updated_at"` | `updated_at` |

#### Struct: `Session`
| Field | Type | JSON |
|---|---|---|
| `ID` | `pgtype.UUID` | `"id"` |
| `UserID` | `pgtype.UUID` | `"user_id"` |
| `TokenHash` | `string` | `"token_hash"` |
| `ExpiresAt` | `pgtype.Timestamptz` | `"expires_at"` |
| `LastActiveAt` | `pgtype.Timestamptz` | `"last_active_at"` |
| `IpAddress` | `*netip.Addr` | `"ip_address"` |
| `UserAgent` | `pgtype.Text` | `"user_agent"` |
| `CreatedAt` | `pgtype.Timestamptz` | `"created_at"` |

#### Struct: `AuditLog`
| Field | Type | JSON |
|---|---|---|
| `ID` | `pgtype.UUID` | `"id"` |
| `UserID` | `pgtype.UUID` | `"user_id"` |
| `EventType` | `string` | `"event_type"` |
| `IpAddress` | `*netip.Addr` | `"ip_address"` |
| `UserAgent` | `pgtype.Text` | `"user_agent"` |
| `Metadata` | `[]byte` | `"metadata"` |
| `CreatedAt` | `pgtype.Timestamptz` | `"created_at"` |

---

### 9.5 db/querier.go

**Path:** `internal/storage/db/querier.go`
**Generated by:** sqlc v1.30.0
**Purpose:** Interface listing all generated query methods. This enables mocking in tests.

#### Interface: `Querier`

Lists all 22 query methods:
- User: `CreateUser`, `GetUserByID`, `GetUserByEmail`, `GetUserByGoogleID`, `GetUserByEmailVerificationTokenHash`, `UpsertUserByGoogleID`, `UpdateUser`, `UpdateUserPassword`, `SetEmailVerificationToken`, `VerifyUserEmail`, `IncrementFailedLoginAttempts`, `ResetFailedLoginAttempts`, `LockUser`, `UnlockUser`
- Session: `CreateSession`, `GetSessionByTokenHash`, `UpdateSessionLastActive`, `DeleteSession`, `DeleteSessionByTokenHash`, `DeleteUserSessions`, `CountUserSessions`, `GetOldestUserSession`, `DeleteExpiredSessions`
- Audit: `CreateAuditLog`, `PurgeAuditLogsBefore`

The line `var _ Querier = (*Queries)(nil)` is a compile-time check ensuring `Queries` implements `Querier`.

---

### 9.6 db/queries.sql.go

**Path:** `internal/storage/db/queries.sql.go`
**Generated by:** sqlc v1.30.0
**Purpose:** The actual Go implementations of all SQL queries. Each query has a constant SQL string and a method on `*Queries`.

This file is ~600 lines. Each method follows the same pattern:
1. Calls `q.db.QueryRow` or `q.db.Exec` with the SQL string and parameters
2. Scans the result into the appropriate struct
3. Returns the struct and error

**Notable generated types:**

**`GetSessionByTokenHashRow`** - Custom struct for the JOIN query:
| Field | Type | Description |
|---|---|---|
| `ID` through `CreatedAt` | (Session fields) | From sessions table |
| `UserID_2` | `pgtype.UUID` | `u.id` from users table |
| `UserEmail` | `string` | User's email |
| `UserEmailVerified` | `bool` | Verification status |
| `UserName` | `string` | Display name |
| `UserPicture` | `pgtype.Text` | Avatar |
| `UserProvider` | `string` | Auth provider |

**Parameter structs** (each generated for queries with multiple parameters):
- `CreateUserParams`, `CreateSessionParams`, `CreateAuditLogParams`
- `UpsertUserByGoogleIDParams`, `UpdateUserParams`, `UpdateUserPasswordParams`
- `SetEmailVerificationTokenParams`, `LockUserParams`

---

### 9.7 blob/client.go

**Path:** `internal/storage/blob/client.go`
**Package:** `blob`
**Purpose:** S3-compatible object storage client for avatar uploads/downloads using presigned URLs.

#### Struct: `Client`
| Field | Type | Description |
|---|---|---|
| `bucket` | `string` | S3 bucket name |
| `client` | `*s3.Client` | AWS S3 SDK client |
| `presignClient` | `*s3.PresignClient` | AWS S3 presigning client |
| `uploadTTL` | `time.Duration` | How long presigned PUT URLs are valid |
| `downloadTTL` | `time.Duration` | How long presigned GET URLs are valid |

#### Struct: `PresignedRequest`
| Field | Type | Description |
|---|---|---|
| `URL` | `string` | The presigned URL |
| `Method` | `string` | HTTP method (PUT or GET) |
| `Headers` | `map[string][]string` | Required headers for the request |
| `Expires` | `time.Time` | When the URL expires |

#### Struct: `Config`
Same fields as `StorageConfig` in the config package.

#### Functions

**`New(ctx, cfg) (*Client, error)`**
- Validates bucket, region, and credentials are present
- Creates AWS SDK config with static credentials
- Creates S3 client with optional custom endpoint (for MinIO) and path-style addressing
- Returns the Client

**`(c *Client) PresignPutObject(ctx, key, contentType) (PresignedRequest, error)`**
- Creates a presigned PUT URL for uploading an object
- Sets `Content-Type` on the request
- Applies upload TTL
- **Used by:** `AvatarHandler.HandleAvatarUploadURL`

**`(c *Client) PresignGetObject(ctx, key) (PresignedRequest, error)`**
- Creates a presigned GET URL for downloading an object
- Applies download TTL
- **Used by:** `AvatarHandler.HandleAvatarConfirm`, `AvatarHandler.HandleAvatarURL`

**`(c *Client) HeadObject(ctx, key) error`**
- Checks if an object exists by sending a HEAD request
- Returns error if object doesn't exist
- **Used by:** `AvatarHandler.HandleAvatarConfirm` (verifies upload completed)

**`(c *Client) DeleteObject(ctx, key) error`**
- Deletes an object from storage
- **Used by:** `AvatarHandler.HandleAvatarConfirm` (cleans up old avatar)

**`expiresAt(ttl) time.Time`** - Returns `time.Now().Add(ttl)` or zero time if TTL <= 0.

---

## 10. Application Layer - internal/app/recipes/

### 10.1 types.go

**Path:** `internal/app/recipes/types.go`
**Package:** `recipes`
**Purpose:** Domain types for recipe generation.

#### Struct: `RecipeRequest`
| Field | Type | Description |
|---|---|---|
| `Ingredient` | `string` | Main ingredient or cuisine type |
| `DietaryRestrictions` | `string` | Optional dietary restrictions (e.g., "gluten-free") |

#### Struct: `Recipe`
| Field | Type | Description |
|---|---|---|
| `Title` | `string` | Recipe name |
| `Description` | `string` | Short description |
| `PrepTime` | `string` | Preparation time (e.g., "15 minutes") |
| `CookTime` | `string` | Cooking time |
| `Servings` | `int` | Number of servings |
| `Ingredients` | `[]string` | List of ingredients |
| `Instructions` | `[]string` | Step-by-step instructions |
| `Tips` | `[]string` | Optional cooking tips |

Both structs have `json`, `jsonschema`, `example`, and `validate` tags. The `jsonschema` tags are used by Genkit for structured output generation (telling the AI model what schema to follow).

---

### 10.2 ports.go

**Path:** `internal/app/recipes/ports.go`
**Package:** `recipes`
**Purpose:** Defines the interface (port) for recipe generation.

#### Interface: `Generator`
```go
type Generator interface {
    Generate(ctx context.Context, req RecipeRequest) (*Recipe, error)
}
```

This is the **port** in the ports-and-adapters pattern. The application layer defines what it needs, and the `ai/recipes` package provides the concrete implementation. This allows swapping AI providers without changing the business logic.

---

### 10.3 service.go

**Path:** `internal/app/recipes/service.go`
**Package:** `recipes`
**Purpose:** Application service that orchestrates recipe generation.

#### Struct: `Service`
| Field | Type |
|---|---|
| `generator` | `Generator` |

**`NewService(generator) *Service`** - Constructor. Called in `main.go`.

**`(s *Service) Generate(ctx, req) (*Recipe, error)`** - Delegates to the generator. Currently a thin wrapper, but exists to allow adding caching, validation, logging, or other cross-cutting concerns without modifying the AI adapter.

---

## 11. AI Layer - internal/ai/recipes/

**Path:** `internal/ai/recipes/genkit_generator.go`
**Package:** `recipes` (import alias `airecipes`)
**Purpose:** Implements the `Generator` interface using Google Genkit and Gemini AI.

#### Struct: `GenkitGenerator`
| Field | Type | Description |
|---|---|---|
| `flow` | `*core.Flow[*RecipeRequest, *Recipe, struct{}]` | A Genkit flow (typed pipeline) |

#### Constructor: `NewGenkitGenerator(g *genkit.Genkit) *GenkitGenerator`

Defines a Genkit flow named `"recipeGeneratorFlow"`:
1. Takes a `*RecipeRequest` as input
2. Builds a text prompt:
   ```
   Create a recipe with the following requirements:
       Main ingredient: {ingredient}
       Dietary restrictions: {restrictions or "none"}
   ```
3. Calls `genkit.GenerateData[Recipe](ctx, g, ai.WithPrompt(prompt))`
   - `GenerateData` is a generic function that asks the model to return structured data matching the `Recipe` type
   - The model uses the `jsonschema` tags to understand the expected output format
4. Returns the generated `*Recipe`

#### Method: `(g *GenkitGenerator) Generate(ctx, req) (*Recipe, error)`
- Runs the flow with the given request
- The flow is a Genkit concept that provides tracing, retries, and observability

**How Genkit works:** Genkit is Google's AI framework. It provides:
- **Flows:** Named, typed, traceable functions
- **Plugins:** Model providers (Google AI, Vertex AI, etc.)
- **Structured output:** `GenerateData[T]` forces the model to return JSON matching the Go struct's schema
- **Dev UI:** `genkit start` opens a web UI at port 4000 for testing flows, viewing traces, etc.

---

## 12. Email - internal/email/

**Path:** `internal/email/mailer.go`
**Package:** `email`
**Purpose:** Sends emails via Gmail SMTP with STARTTLS.

#### Constants

| Constant | Value |
|---|---|
| `gmailSMTPHost` | `"smtp.gmail.com"` |
| `gmailSMTPPort` | `"587"` |

#### Interface: `Mailer`
```go
type Mailer interface {
    Send(ctx context.Context, to, subject, textBody, htmlBody string) error
}
```
**Used by:** `AuthHandler` for sending verification and lockout emails.

#### Struct: `GmailMailer`
| Field | Type | Description |
|---|---|---|
| `from` | `string` | Sender email address |
| `username` | `string` | Gmail username (same as `from`) |
| `password` | `string` | Gmail App Password |

#### Functions

**`NewGmailMailer(from, appPassword) (*GmailMailer, error)`**
- Validates both fields are non-empty
- Returns error if credentials are missing (mailer is then set to nil in router.go)

**`(m *GmailMailer) Send(ctx, to, subject, textBody, htmlBody) error`**
1. Nil-safe check
2. Validates recipient is non-empty
3. Validates at least one body is provided
4. Builds the email message via `buildMessage`
5. Opens TCP connection to `smtp.gmail.com:587`
6. Creates SMTP client
7. Requires and upgrades to TLS via `STARTTLS` (fails if server does not support it)
8. Authenticates with `PLAIN` auth
9. Sends the email (MAIL FROM, RCPT TO, DATA, QUIT)

**`buildMessage(from, to, subject, textBody, htmlBody) string`**
- Builds RFC 2822 email headers
- If no HTML body: sends plain text with `Content-Type: text/plain`
- If HTML body: sends multipart/alternative with a fixed boundary, containing both text and HTML parts
- Subject is Q-encoded for UTF-8 safety via `encodeHeader`

**`encodeHeader(value) string`**
- Strips CR/LF (header injection prevention)
- Uses `mime.QEncoding.Encode("utf-8", clean)` for safe encoding

---

## 13. Rate Limiting - internal/ratelimit/

**Path:** `internal/ratelimit/valkey.go`
**Package:** `ratelimit`
**Purpose:** Sliding window rate limiting using Valkey (Redis-compatible) sorted sets.

#### Interface: `Limiter`
```go
type Limiter interface {
    Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error)
}
```

#### Struct: `ValkeyLimiter`
| Field | Type | Description |
|---|---|---|
| `client` | `*redis.Client` | Redis/Valkey client |
| `prefix` | `string` | Key prefix (`"rl:"`) |

#### Functions

**`NewValkeyLimiter(addr, password) *ValkeyLimiter`**
- Creates a Redis client with the given address and password
- Called from `api.NewRouter` when rate limiting is enabled

**`(l *ValkeyLimiter) Allow(ctx, key, limit, window) (bool, error)`**

**Sliding window algorithm using Redis sorted sets:**

1. Gets current time in milliseconds
2. Computes window start: `now - window`
3. Builds Redis key: `"rl:" + key`
4. Creates a unique member: `"{timestamp}-{random_suffix}"` (random suffix prevents collisions for requests at the same millisecond)
5. Executes a Redis pipeline (atomic):
   - `ZADD key timestamp member` - adds this request
   - `ZREMRANGEBYSCORE key 0 windowStart` - removes entries outside the window
   - `ZCARD key` - counts entries in the window
   - `EXPIRE key window+1s` - sets TTL for automatic cleanup
6. If count <= limit: request is allowed
7. If count > limit: request is denied

**Why sorted sets?** Each element has a score (the timestamp). By removing elements with scores outside the window, we get an accurate count of requests within the sliding window. This is more accurate than fixed-window counters.

**Fail-open:** If the limiter is nil, the client is nil, or any Redis error occurs, the function returns `true` (allow). Rate limiting should never block legitimate requests due to infrastructure issues.

**`randomSuffix() string`** - Generates 8 random bytes, hex-encoded. Prevents sorted set member collisions.

---

## 14. Background Services - internal/service/

**Path:** `internal/service/audit_cleanup.go`
**Package:** `service`
**Purpose:** Scheduled audit log purge service.

#### Struct: `AuditCleanupService`
| Field | Type |
|---|---|
| `queries` | `*db.Queries` |

#### Functions

**`NewAuditCleanupService(queries) *AuditCleanupService`** - Constructor.

**`(s *AuditCleanupService) PurgeBefore(ctx, cutoff) (int64, error)`**
- Validates service is initialized
- Converts `cutoff` time to `pgtype.Timestamptz`
- Calls `queries.PurgeAuditLogsBefore` which runs:
  ```sql
  WITH deleted AS (DELETE FROM audit_logs WHERE created_at < $1 RETURNING 1)
  SELECT COUNT(*) FROM deleted
  ```
- Returns the number of deleted rows

**How it's scheduled:** In `main.go`, a cron job calls `PurgeBefore` with `time.Now().AddDate(0, 0, -cfg.Audit.RetentionDays)` (90 days ago by default). The cron schedule defaults to `"0 3 * * *"` (daily at 3 AM). Each job has a 5-minute timeout.

---

## 15. Assets - assets/

**Path:** `assets/embed.go`
**Package:** `assets`
**Purpose:** Uses Go's `//go:embed` directive to embed the SvelteKit build output into the Go binary.

```go
//go:embed all:static
var StaticFiles embed.FS
```

- `all:static` embeds everything in the `assets/static/` directory, including files starting with `.` or `_`
- At build time (`make build`), SvelteKit output is copied from `web/build/*` to `assets/static/`
- At runtime, the `static.go` handler serves these files from the embedded filesystem
- This means the production binary is a single executable containing both the Go server and the frontend

**`assets/static/.gitkeep`** - Empty placeholder file so Git tracks the directory.

---

## 16. Database Migrations - migrations/

Managed by [goose](https://github.com/pressly/goose). Each file has `-- +goose Up` and `-- +goose Down` sections for forward and rollback migrations.

### Migration 001: `001_create_users.sql`

**Up:**
1. Enables `pgcrypto` extension (provides `gen_random_uuid()`)
2. Creates `users` table:

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE |
| `email_verified` | `BOOLEAN` | NOT NULL, DEFAULT FALSE |
| `name` | `VARCHAR(255)` | NOT NULL |
| `picture` | `TEXT` | nullable |
| `password_hash` | `TEXT` | nullable (Google users don't have one) |
| `provider` | `VARCHAR(50)` | NOT NULL, CHECK IN ('google', 'credentials') |
| `google_id` | `VARCHAR(255)` | UNIQUE (nullable) |
| `failed_login_attempts` | `INTEGER` | NOT NULL, DEFAULT 0 |
| `locked_until` | `TIMESTAMPTZ` | nullable |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() |

3. Creates indexes:
   - `idx_users_email` on `email`
   - `idx_users_google_id` on `google_id` WHERE google_id IS NOT NULL (partial index)

4. Creates trigger function `update_updated_at_column()` that sets `updated_at = NOW()` on any UPDATE
5. Attaches trigger to users table

**Down:** Drops trigger, function, and table.

### Migration 002: `002_create_sessions.sql`

**Up:** Creates `sessions` table:

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | `UUID` | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| `token_hash` | `VARCHAR(64)` | NOT NULL, UNIQUE |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL |
| `last_active_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() |
| `ip_address` | `INET` | nullable |
| `user_agent` | `TEXT` | nullable |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() |

Indexes: `idx_sessions_token_hash`, `idx_sessions_user_id`, `idx_sessions_expires_at`

**ON DELETE CASCADE:** When a user is deleted, all their sessions are automatically deleted.

**Down:** Drops table.

### Migration 003: `003_create_audit_logs.sql`

**Up:** Creates `audit_logs` table:

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | `UUID` | REFERENCES users(id) ON DELETE SET NULL |
| `event_type` | `TEXT` | NOT NULL |
| `ip_address` | `INET` | nullable |
| `user_agent` | `TEXT` | nullable |
| `metadata` | `JSONB` | nullable (flexible key-value data) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() |

Indexes: `idx_audit_logs_user_id`, `idx_audit_logs_event_type`, `idx_audit_logs_created_at` (DESC)

**ON DELETE SET NULL:** When a user is deleted, their audit logs are preserved but `user_id` becomes NULL.

**Down:** Drops table.

### Migration 004: `004_add_email_verification.sql`

**Up:** Adds columns to users table:
- `email_verification_token_hash TEXT` - SHA-256 hash of verification token
- `email_verification_expires_at TIMESTAMPTZ` - Token expiration time
- Partial index `idx_users_email_verification_token_hash` WHERE token_hash IS NOT NULL

**Down:** Drops index and columns.

---

## 17. Generated Docs - docs/

**Path:** `docs/docs.go`
**Generated by:** `swag init` (via `make swag`)
**Purpose:** Registers the Swagger/OpenAPI spec with the swag library.

Contains a large `docTemplate` constant with the full OpenAPI 2.0 spec in JSON format. This includes:
- All API paths with request/response schemas
- All type definitions (request/response structs)
- Tags for grouping endpoints (auth, system, recipes)

The `init()` function registers the spec so it can be served at runtime.

**Other generated files:**
- `docs/swagger.json` - JSON format of the spec
- `docs/swagger.yaml` - YAML format
- `docs/openapi.json` - OpenAPI format

These are listed in `.gitignore` because they're regenerated from code annotations.

---

## 18. Utility Scripts - scripts/

### scripts/audit/README.md
Instructions for running audit SQL scripts via `psql`.

### scripts/audit/audit_logs_by_event.sql
```sql
SELECT ... FROM audit_logs WHERE event_type = :'event_type' ORDER BY created_at DESC;
```
Usage: `psql "$DATABASE_URL" -v event_type='login_failure' -f scripts/audit/audit_logs_by_event.sql`

### scripts/audit/audit_logs_by_user.sql
```sql
SELECT ... FROM audit_logs WHERE user_id = :'user_id' ORDER BY created_at DESC;
```
Usage: `psql "$DATABASE_URL" -v user_id='UUID' -f scripts/audit/audit_logs_by_user.sql`

### scripts/audit/audit_logs_recent.sql
```sql
SELECT ... FROM audit_logs WHERE created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC;
```
Shows all audit events from the last 7 days.

### scripts/audit/purge_audit_logs.sql
```sql
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```
Manual purge script (the same operation the cron job does automatically).

---

## 19. Request Flows

### Registration Flow
```
Client → POST /api/auth/register {email, password, name}
  → Rate limit check (register:IP, 3/hour)
  → Normalize email
  → Validate name (1-255 chars)
  → Validate password (8+ chars, uppercase, number, special, not common)
  → Check if email exists → if yes, return 200 (prevent enumeration)
  → Hash password (Argon2id)
  → Insert user into DB
  → Revoke any existing session (rotation)
  → Create new session (32-byte token, SHA-256 hash stored)
  → Set session cookie
  → Audit log "register_success"
  → Send verification email (async, non-blocking)
  → Return 200 {status: "ok"}
```

### Login Flow
```
Client → POST /api/auth/login {email, password}
  → Normalize email
  → Rate limit check (login:email:IP, 5/15min)
  → Look up user by email
    → Not found: FakePasswordHash, audit log, return 401
  → Check account lockout
  → Check provider is "credentials"
    → Wrong provider: FakePasswordHash, return 401
  → Verify password (Argon2id, constant-time compare)
    → Wrong: increment failures, lock if >=10, return 401
  → Reset failed attempts
  → Create session, set cookie
  → Audit log "login_success"
  → Return 200 {status: "ok"}
```

### Google OAuth Flow
```
Client → GET /api/auth/google
  → Rate limit check
  → Generate state (32 bytes) + verifier (64 bytes)
  → Compute PKCE challenge = SHA256(verifier)
  → Set oauth_state + oauth_verifier cookies
  → Redirect to Google with state + challenge

Google → GET /api/auth/google/callback?state=X&code=Y
  → Verify state matches cookie (constant-time)
  → Clear OAuth cookies
  → Exchange code for token (with PKCE verifier)
  → Fetch user info from Google
  → Normalize email
  → Check for email conflicts
  → Upsert user (create or update)
  → Revoke existing session
  → Create new session, set cookie
  → Audit log "oauth_login"
  → Redirect to post-login URL
```

### Avatar Upload Flow
```
1. Client → POST /api/auth/avatar/upload-url {content_type, size}
     → Validate content type (jpeg/png/webp)
     → Validate size (0 < size <= 5MB)
     → Generate S3 key: users/{userID}/avatar.{ext}
     → Create presigned PUT URL
     → Return {key, url, method, headers, expires_at}

2. Client → PUT {presigned_url} with file body
     → Direct upload to MinIO (bypasses Go server)

3. Client → POST /api/auth/avatar/confirm {key}
     → Validate key format
     → HEAD object to verify upload exists
     → Update user.picture = key
     → Delete old avatar if different
     → Generate presigned GET URL
     → Return {url, expires_at}
```

### Recipe Generation Flow
```
Client → POST /api/recipes/generate {ingredient, dietaryRestrictions}
  → RequireAuth middleware (validate session cookie)
  → Validate ingredient is not empty
  → Service.Generate(request)
    → GenkitGenerator.Generate(request)
      → Genkit flow "recipeGeneratorFlow"
        → Build text prompt
        → genkit.GenerateData[Recipe](prompt)
          → Gemini 2.5 Flash generates structured JSON
        → Return Recipe
  → Map to API response
  → Return 200 {title, description, prepTime, ...}
```

---

## 20. Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3400` | HTTP server port |
| `ENV` | No | `development` | `development` or `production` |
| `GEMINI_API_KEY` | Yes (for AI) | - | Google AI Studio API key |
| `POSTGRES_USER` | No | `app` | Database user |
| `POSTGRES_PASSWORD` | Yes | - | Database password |
| `POSTGRES_DB` | No | `app` | Database name |
| `POSTGRES_HOST` | No | `localhost` | Database host |
| `POSTGRES_PORT` | No | `5432` | Database port |
| `POSTGRES_SSLMODE` | No | `disable` | `disable`/`require` |
| `SKIP_MIGRATION_CHECK` | No | `false` | Skip migration verification on startup |
| `VALKEY_HOST` | No | `localhost` | Valkey host |
| `VALKEY_PORT` | No | `6379` | Valkey port |
| `VALKEY_PASSWORD` | Yes | - | Valkey password |
| `RATE_LIMIT_ENABLED` | No | `true` | Enable/disable rate limiting |
| `RATE_LIMIT_*_LIMIT` | No | (varies) | Max requests per window |
| `RATE_LIMIT_*_WINDOW_SECONDS` | No | (varies) | Window duration |
| `S3_ENDPOINT` | Yes (for avatars) | - | S3/MinIO endpoint URL |
| `S3_REGION` | No | `us-east-1` | S3 region |
| `S3_BUCKET` | Yes (for avatars) | - | Bucket name |
| `S3_ACCESS_KEY_ID` | Yes (for avatars) | - | S3 access key |
| `S3_SECRET_ACCESS_KEY` | Yes (for avatars) | - | S3 secret key |
| `S3_FORCE_PATH_STYLE` | No | `true` | Use path-style URLs (required for MinIO) |
| `S3_PRESIGN_UPLOAD_TTL_SECONDS` | No | `900` | Upload URL validity |
| `S3_PRESIGN_DOWNLOAD_TTL_SECONDS` | No | `600` | Download URL validity |
| `S3_AVATAR_MAX_BYTES` | No | `5242880` | Max avatar file size |
| `AUTH_COOKIE_SECURE` | No | (auto) | Force cookie secure flag |
| `AUTH_POST_LOGIN_REDIRECT_URL` | No | `/` | Redirect after Google OAuth |
| `GOOGLE_CLIENT_ID` | Yes (for OAuth) | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes (for OAuth) | - | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes (for OAuth) | - | OAuth callback URL |
| `AUDIT_CLEANUP_CRON` | No | `0 3 * * *` | Cron schedule for audit purge |
| `AUDIT_RETENTION_DAYS` | No | `90` | Days to keep audit logs |
| `GMAIL_APP_PASSWORD` | Yes (for email) | - | Gmail app password |
| `CONTACT_EMAIL` | Yes (for email) | - | Sender email address |
| `APP_BASE_URL` | No | `http://localhost:{PORT}` | Base URL for email links |

---

## 21. Security Model

### Password Security
- **Algorithm:** Argon2id (winner of the Password Hashing Competition)
- **Parameters:** 64MB memory, 3 iterations, 4 threads, 16-byte salt, 32-byte output
- **Common password blocking:** ~55 passwords that meet complexity requirements but are easily guessable
- **Timing attack prevention:** `FakePasswordHash` is called when user doesn't exist or provider is wrong, ensuring consistent response times

### Session Security
- **Token generation:** 32 bytes of `crypto/rand` randomness (256 bits of entropy)
- **Storage:** Only SHA-256 hash is stored in DB; raw token is in the cookie
- **Cookie flags:** `HttpOnly` (always), `Secure` (production), `SameSite=Strict` (production), `Path=/`
- **Cookie name:** `__Host-` prefix in production (browser-enforced security)
- **Absolute expiration:** 7 days
- **Idle timeout:** 30 minutes of inactivity
- **Session limit:** Max 5 concurrent sessions per user (oldest evicted)
- **Session rotation:** On login/register, existing session is revoked
- **Password change:** All sessions revoked, new session created

### Account Lockout
- **Threshold:** 10 failed login attempts
- **Duration:** 30 minutes
- **Auto-unlock:** On next login attempt after lock expires
- **Notification:** Lockout email sent to user

### OAuth Security
- **CSRF protection:** Random state parameter verified via HttpOnly cookie + constant-time comparison
- **PKCE (S256):** Code verifier stored in HttpOnly cookie, challenge sent to Google
- **Email conflict prevention:** If a Google email matches an existing credentials-based account, login is rejected

### Rate Limiting
- **Algorithm:** Sliding window via Redis sorted sets
- **Keying:** By action + IP address
- **Fail-open:** Redis errors allow the request through

### Security Headers
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'; ...` (strict CSP)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)

### Audit Trail
- All authentication events are logged with IP, user agent, and metadata
- Emails are stored as SHA-256 hashes in audit logs (privacy)
- Logs are automatically purged after 90 days (configurable)

### Infrastructure Security
- Docker containers run with `no-new-privileges:true`
- PostgreSQL uses `scram-sha-256` authentication (not MD5)
- All services bind to `127.0.0.1` only (not exposed to network)
- Valkey requires password authentication
