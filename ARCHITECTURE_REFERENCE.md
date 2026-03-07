# Architecture Reference Documentation

## 1) System Architecture Overview

### 1.1 High-level architecture (textual diagram)

```text
[Clients]
  |- Web Frontend / Swagger / API consumers
  v
[NestJS API Gateway Layer - single deployable]
  |- Global middleware: helmet, compression, cookie-parser, CORS
  |- Global validation: ValidationPipe
  |- Global throttling: ThrottlerGuard (controller-level usage)
  |- Global interceptor: DebugInterceptor
  v
[Feature Modules]
  |- at-a-glance
  |- scenario-planning
  |- optimized-baseline
  |- analytics
  |- sight-insights
  |- product-insights
  |- customers
  |- events
  |- metadata
  |- shared/auth, shared/logging, shared/database
  v
[Data Access Layer]
  |- DatabaseService (mysql2 pools, dual DB routing)
  |- Repositories (raw SQL + parameterized queries in many places)
  v
[Data Stores]
  |- MariaDB schema(s) (primary runtime DB dependency)
  |- Redis (cache/session auxiliary dependency)
```

### 1.2 Layered architecture model

- **Presentation Layer**
  - NestJS controllers under `src/**/controllers` and some root controllers in `src`.
  - Handles HTTP route definitions, query/body parsing, validation prechecks, and Swagger decorators.
- **Service Layer**
  - `src/**/services` encapsulates use-case logic, orchestration, and response composition.
- **Domain/Transformation Layer**
  - `src/**/interfaces` for typed contracts.
  - `src/**/transformers` for output shaping and derived metrics.
  - Constants in `src/**/config` and `src/**/.constants.ts`.
- **Data Layer**
  - `src/shared/database/database.service.ts` owns connection pooling, retries, transactions, and query execution.
  - Feature repositories (`src/**/repositories`) issue SQL queries against MariaDB views/tables.

### 1.3 Monolith vs microservice

- **Current structure: Modular monolith**
  - Single NestJS process (`src/main.ts` + `src/app.module.ts`).
  - Feature modules are strongly separated in code but deployed together.
  - Shared concerns (auth/database/logging) centralized in `SharedModule`.

### 1.4 Design patterns used

- **NestJS module pattern** (`@Module`) for bounded context grouping.
- **Controller-Service-Repository pattern** for request -> business logic -> persistence flow.
- **Dependency Injection** throughout via Nest IoC container.
- **Interceptor pattern** for cross-cutting debug query capture.
- **Strategy pattern** in authentication (LDAP strategy, JWT strategy, NextAuth-JWT strategy, optional SAML strategy).
- **DTO + validation pattern** using class-validator/class-transformer.

### 1.5 Dependency flow between modules

```text
main.ts
  -> AppModule
      -> ConfigModule (global config + Joi validation)
      -> SharedModule
          -> AuthModule
          -> DatabaseModule
          -> LoggingModule
      -> FeatureModule(s)
          -> FeatureService
              -> FeatureRepository
                  -> DatabaseService
```

Guideline for reuse:

- Keep flow strictly one-directional: `controller -> service -> repository -> database`.
- Avoid reverse imports from `shared/*` into feature internals except via exported providers.

---

## 2) Technology Stack

### 2.1 Backend and runtime

- **Framework**: NestJS `^10.x`
- **Language**: TypeScript `^5.8.x`
- **Runtime**: Node.js `>=18.0.0` (from `engines`)
- **HTTP platform**: `@nestjs/platform-express`
- **API docs**: `@nestjs/swagger` (Swagger UI + OpenAPI)

### 2.2 Data and integration

- **Primary DB driver in implementation**: `mysql2` (`mysql2/promise`)
- **ORM present but not primary in runtime path**: TypeORM dependency exists, but most modules use raw SQL through `DatabaseService`.
- **PostgreSQL driver present**: `pg` installed (used as adaptation target, not current primary path).
- **Cache**: Redis (`redis` + `cache-manager-redis-store`)
- **Auth/integration**:
  - JWT: `@nestjs/jwt`, `passport-jwt`
  - LDAP: `ldapts`, custom passport strategy
  - NextAuth token parsing: `next-auth/jwt`
  - SAML capability: `passport-saml`

### 2.3 Build, quality, and tooling

- **Package manager**: npm (lockfile present: `package-lock.json`)
- **Build toolchain**: Nest CLI + TypeScript (`nest build`, `tsc` under hood)
- **Linting**: ESLint (`.eslintrc.js`)
- **Formatting**: Prettier (`.prettierrc`)
- **Tests**: Jest + ts-jest + supertest
- **Git hooks**: Husky + lint-staged + commitlint + Commitizen + conventional commits

### 2.4 Containerization and deployment

- **Container tooling**: Dockerfiles (`Dockerfile`, `Dockerfile.dev`, `Dockerfile.prod`)
- **Orchestration for environments**: Docker Compose (`docker-compose*.yml`)
- **CI/CD currently observed**: Jenkins pipelines (`Jenkinsfile`, `Jenkinsfile_gen`)

### 2.5 Static analysis / quality gates

- ESLint rules enforce no-debugger, no-var, prefer-const, TS no-unused-vars.
- Jest global coverage threshold configured at 80% (branches/functions/lines/statements).
- No SonarQube config detected in repository.

---

## 3) Project Structure

```text
.
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── config/
│   │   └── configuration.ts
│   ├── shared/
│   │   ├── auth/                # Auth module, strategies, guards, DTOs
│   │   ├── database/            # DB pools, retry, tx, query execution
│   │   ├── logging/             # Login audit logger + repository
│   │   ├── filters/             # Global exception filter class (not wired globally yet)
│   │   ├── interceptors/        # DebugInterceptor for SQL debug payloads
│   │   ├── dtos/
│   │   ├── constants/
│   │   ├── exceptions/
│   │   ├── interfaces/
│   │   └── request-context/
│   ├── at-a-glance/
│   ├── scenario-planning/
│   ├── optimized-baseline/
│   ├── analytics/
│   ├── sight-insights/
│   ├── product-insights/
│   ├── customers/
│   ├── events/
│   └── metadata/
├── test/
│   ├── app.e2e-spec.ts
│   ├── jest-e2e.json
│   └── setup.ts
├── Dockerfile*
├── docker-compose*.yml
├── Jenkinsfile*
├── package.json
└── README.md
```

### 3.1 Module interaction model

- Each feature module has:
  - `controllers/` -> route handlers
  - `services/` -> orchestration/validation/transform dispatch
  - `repositories/` -> SQL access through shared DB service
  - `transformers/` + `interfaces/` -> response shaping and typing
- Shared infrastructure modules are imported by feature modules through `SharedModule`.

---

## 4) Configuration Management

### 4.1 Config loading mechanism

- `ConfigModule.forRoot` in `src/app.module.ts` loads, in order:
  1. `env.${NODE_ENV}`
  2. `.env.local`
  3. `.env`
- Config object built in `src/config/configuration.ts`.
- Joi schema (`configurationSchema`) enforces required variables and defaults.

### 4.2 Configuration categories

- App/runtime: `NODE_ENV`, `PORT`, `API_PREFIX`, `APP_NAME`, `APP_VERSION`
- Database:
  - PostgreSQL-style keys exist (`DATABASE_*`)
  - Active runtime keys for MariaDB (`MARIADB_*`)
- Redis: `REDIS_*`
- Auth/security: `JWT_*`, `NEXTAUTH_SECRET`, `BCRYPT_ROUNDS`, `RATE_LIMIT_*`, `CORS_ORIGIN`
- Swagger: `SWAGGER_*`
- Logging: `LOG_*`
- External integration: `LDAP_*`, `FAST_API_*`, `EXTERNAL_API_*`
- TLS/certs: `HTTPS_ENABLED`, `SSL_KEY_PATH`, `SSL_CERT_PATH`, SAML cert/key paths

### 4.3 Secrets management guidance

Current repo has values that should not be hardcoded when reusing:

- hardcoded LDAP bind password fallback in config code
- plaintext JWT examples in some docker compose files

For reusable architecture:

- move all secrets to environment or secret manager (Vault/AWS SM/K8s Secret).
- never commit real secret values.
- keep only placeholders in `.env.example`.

### 4.4 Recommended `.env.example` template

```bash
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
APP_NAME=Your Service
APP_VERSION=1.0.0

# PostgreSQL target
DATABASE_URL=postgresql://app_user:app_password@localhost:5432/app_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=app_user
DATABASE_PASSWORD=app_password
DATABASE_NAME=app_db
DATABASE_SSL=false
DATABASE_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600

# Auth
JWT_SECRET=CHANGE_ME_MIN_32_CHARACTERS
JWT_REFRESH_SECRET=CHANGE_ME_MIN_32_CHARACTERS
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
NEXTAUTH_SECRET=CHANGE_ME_MIN_32_CHARACTERS

# Security + CORS
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
BCRYPT_ROUNDS=12

# Swagger
SWAGGER_ENABLED=true
SWAGGER_TITLE=Service API
SWAGGER_DESCRIPTION=Service API Docs
SWAGGER_VERSION=1.0.0
SWAGGER_PATH=api/docs
SWAGGER_HOST=http://localhost:3000
```

### 4.5 Optional `config.yaml` / `application.yml` reference

The project currently uses env + Nest Config (not YAML), but below is reusable reference:

```yaml
# config.yaml
app:
  name: your-service
  version: 1.0.0
  port: 3000
  apiPrefix: api/v1
database:
  provider: postgres
  url: ${DATABASE_URL}
redis:
  host: ${REDIS_HOST}
  port: ${REDIS_PORT}
security:
  jwtSecret: ${JWT_SECRET}
  corsOrigin: ${CORS_ORIGIN}
```

```yaml
# application.yml
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
server:
  port: 3000
```

### 4.6 Environment profile strategy

- **development**: Swagger enabled, verbose logging, debug allowed.
- **staging/qa**: prod-like, controlled debug.
- **production**: Swagger disabled, strict CORS/rate limit, debug off, TLS enabled.

---

## 5) Database Layer (PostgreSQL Adaptation)

### 5.1 Current database architecture

- `DatabaseService` manages **two MariaDB pools**:
  - RSP database
  - demand-version database
- Query execution is mostly raw SQL from repositories.
- Retry strategy implemented in `DatabaseService` with backoff.
- Explicit transaction wrapper available (`executeTransaction`, `executeBatch`).
- Health checks run every 30s for pools.

### 5.2 ORM/query builder status

- TypeORM dependency exists but is not the main data path.
- Primary pattern is custom query execution via mysql2 (`database.service.ts`).

### 5.3 Migration strategy status

- Scripts for TypeORM migrations exist in `package.json`, but migration config/data source files are not present.
- Effective schema evolution appears SQL/view-driven in external DB layer.

### 5.4 PostgreSQL adaptation plan

#### A) Replace DB driver implementation

- Replace mysql2 pool code in `DatabaseService` with `pg` (`Pool`).
- Keep service API contract stable (`executeRspQuery`, transactions, retries) to minimize feature churn.

#### B) Introduce unified `DATABASE_URL`

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

#### C) SQL compatibility migration checklist

Current SQL uses MariaDB-specific syntax/functions:

- `FIND_IN_SET`
- `CURDATE()`
- `GROUP_CONCAT`
- JSON extraction style tied to MariaDB forms
- some schema qualifiers and custom DB functions

For PostgreSQL:

- replace `FIND_IN_SET` with `= ANY(string_to_array(...))` or normalized joins
- replace date funcs with `CURRENT_DATE`, `date_trunc`, intervals
- replace `GROUP_CONCAT` with `string_agg`
- use `->`/`->>` for JSON fields and JSONB operators
- move custom fiscal functions (`get_fiscal_qtrs_range`, etc.) to Postgres functions or app logic

#### D) Transactions and pooling

- Use `pg.Pool` with explicit `pool.connect()` + `BEGIN/COMMIT/ROLLBACK`.
- Keep connection pool limits configurable via env:
  - `DB_POOL_MAX`
  - `DB_IDLE_TIMEOUT_MS`
  - `DB_CONNECTION_TIMEOUT_MS`

#### E) Recommended migration tooling

Choose one:

- **Option 1**: Keep raw SQL + `node-pg-migrate`
- **Option 2**: Adopt TypeORM fully (entities + migrations)
- **Option 3**: Adopt Prisma for stronger schema workflow

For minimal disruption to this codebase style, Option 1 is closest.

### 5.5 PostgreSQL initialization example

```bash
# local
createdb app_db
psql -d app_db -c "CREATE SCHEMA IF NOT EXISTS app_core;"

# run migrations (example with node-pg-migrate)
npx node-pg-migrate up
```

---

## 6) API Layer

### 6.1 API structure and routing

- Global prefix from config: default `api/v1`.
- Controller route roots include:
  - `/auth`
  - `/at-a-glance`
  - `/scenario-planning`
  - `/optimized-baseline`
  - `/analytics`
  - `/events`
  - `/customers`
  - `/product-insights`
  - `/sight-insights`
  - `/metadata`
  - root health/info endpoints (`/`, `/info`, etc.)

### 6.2 Versioning strategy

- URL prefix-based versioning via `API_PREFIX` (default `api/v1`).
- No Nest built-in version decorator strategy currently configured.

### 6.3 Middleware and interceptors

- `helmet` security headers
- `compression`
- `cookie-parser`
- CORS with configurable origin
- `ValidationPipe` globally
- `DebugInterceptor` globally appends SQL debug section for debug-enabled requests

### 6.4 Authentication and authorization

- LDAP login endpoint issues JWT access + refresh tokens.
- JWT strategy for bearer auth.
- NextAuth JWT strategy supports:
  - cookie token extraction
  - Authorization Bearer
  - custom `x-nextauth-token` header
- Some feature endpoints have auth guards commented out (review before production).

### 6.5 Request validation

- Global `ValidationPipe` (`whitelist: true`, transform enabled).
- DTO validation via `class-validator`.
- Some controllers still perform manual `if (!param)` checks.

### 6.6 Error handling

- `AllExceptionsFilter` exists but is not globally registered in `main.ts`.
- Many controllers wrap errors with `HttpException`.
- Recommendation: wire global exception filter for consistent error contract.

### 6.7 Example endpoint structure

```text
GET /api/v1/at-a-glance/filters
GET /api/v1/at-a-glance/metrics?version_id=...&duration=2
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
POST /api/v1/events/insert
GET /api/v1/optimized-baseline/table?...
```

---

## 7) Development Environment Setup

### 7.1 Local setup (current repository style)

```bash
git clone <repo-url>
cd tpt_api_v2
npm install
npm run prepare
cp .env .env.local   # or create from template
npm run start:dev
```

### 7.2 PostgreSQL-oriented setup (for new project reuse)

```bash
# 1) Start services
docker compose up -d redis

# 2) Ensure PostgreSQL is available
docker run --name app-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:16

# 3) Configure env
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db

# 4) Run migrations
npm run migration:run

# 5) Start app
npm run start:dev
```

### 7.3 Containerized dev

```bash
docker compose -f docker-compose.dev.local.yml up --build
```

---

## 8) CI/CD Pipeline

### 8.1 Observed pipeline

- Jenkins pipeline triggers deployment via SSH to target hosts.
- Branch-based target selection in `Jenkinsfile_gen`:
  - `master` -> prod-like host
  - `qa` -> qa host
  - others -> dev host
- Remote script `pull_latest.sh tpt_api_v2` handles deployment pull/update.

### 8.2 Build/test/deploy recommendation for reusable template

Suggested stages:

1. Install (`npm ci`)
2. Lint (`npm run lint:check`)
3. Unit tests (`npm test -- --ci`)
4. E2E tests (`npm run test:e2e`)
5. Build (`npm run build`)
6. Docker image build and scan
7. Deploy by environment gate

---

## 9) Testing Strategy

### 9.1 Current testing architecture

- **Unit tests**: Jest with `*.spec.ts` under `src`.
- **E2E tests**: `test/app.e2e-spec.ts` with supertest.
- **Coverage gate**: 80% global thresholds in `jest.config.js`.

### 9.2 Structure

- `test/setup.ts` for test bootstrap env.
- `test/jest-e2e.json` for e2e config.

### 9.3 Reusable guidance

- Keep test pyramid:
  - fast unit tests around services/transformers
  - repository integration tests against ephemeral DB
  - e2e smoke tests on critical endpoints (`/`, `/info`, auth flow)

---

## 10) Static Code Analysis

### 10.1 Existing tools

- ESLint + TypeScript plugin
- Prettier
- eslint-sonarjs and eslint-security packages are installed (not heavily configured in `.eslintrc.js`)
- Husky pre-commit + commit-msg hooks

### 10.2 Commands

```bash
npm run lint:check
npm run lint
npm run format
```

### 10.3 Recommended SonarQube integration (template)

```properties
# sonar-project.properties example
sonar.projectKey=your-service
sonar.sources=src
sonar.tests=test
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

---

## 11) Logging & Monitoring

### 11.1 Logging architecture

- Winston configured in `AppModule`:
  - Console transport
  - `logs/error.log`
  - `logs/combined.log`
- Login audit events persisted to DB via `LoginAuditRepository`.

### 11.2 Log levels

- Configurable via `LOG_LEVEL` (`error|warn|info|debug|verbose`).

### 11.3 Monitoring and diagnostics

- App health endpoint: `GET /api/v1/`
- App metadata endpoint: `GET /api/v1/info`
- DB pool health checks every 30s in `DatabaseService`.
- Optional per-request SQL debug payload via `?debug=1` when enabled.

### 11.4 Gaps and recommended enhancements

- Add centralized log aggregation (ELK/Datadog/CloudWatch).
- Add metrics (Prometheus/OpenTelemetry) and tracing correlation IDs.
- Register and enforce global exception filter for consistent error telemetry.

---

## 12) Security Architecture

### 12.1 Authentication

- LDAP username/password login endpoint.
- JWT access token + refresh token issuance.
- NextAuth token support strategy for federated/session token scenarios.
- Optional SAML strategy + metadata endpoint.

### 12.2 Authorization model

- Guard-based auth is available (`JwtAuthGuard`, `NextAuthJwtGuard`).
- Some endpoints currently have guards commented; enforce before production.

### 12.3 Token management

- JWT secrets from env expected (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXTAUTH_SECRET`).
- Refresh token endpoint validates token type and expiry.

### 12.4 Secure configuration practices

- Use env-based secret injection only.
- Disable debug and query-parameter debugging in production.
- Enforce strict CORS and rate limits in prod.
- Never expose secret-like keys in public env endpoints.

### 12.5 Certificate handling guidance

SAML and HTTPS load certificate/key files from configured paths. For any certificate used in new project:

```bash
openssl x509 -text -noout -in <certificate_file>
```

Validate:

- expiration window (`notBefore` / `notAfter`)
- key strength (RSA >= 2048 or modern EC curves)
- signature algorithm (SHA-2+)
- intended issuer trust model (self-signed only when intentional/internal)

---

## 13) Deployment Architecture

### 13.1 Docker strategy

- `Dockerfile.dev`: dev runtime with debug port.
- `Dockerfile.prod`: multi-stage build with slim runtime and non-root user.
- Compose files define env-specific service wiring.

### 13.2 Services

- API container (NestJS)
- Redis container
- External DB expected (MariaDB currently; PostgreSQL target for adaptation)

### 13.3 Environment provisioning

- Dev/QA/Prod compose variants with different runtime flags.
- Jenkins deploys to environment-specific hosts based on branch.

### 13.4 Kubernetes

- No Kubernetes manifests found in repository.
- If migrating to K8s, create:
  - Deployment, Service, Ingress
  - ConfigMap + Secret
  - HPA
  - NetworkPolicy

---

## 14) Reusable Architecture Template (Bootstrap Guide)

### 14.1 What to copy to new project

- `src/shared` (auth, db abstraction, logging, interceptors, filters, constants)
- One feature module template (controller/service/repository/transformer/interface)
- `src/config/configuration.ts` (refactor for clean env keys)
- testing configs (`jest.config.js`, `test/`)
- quality tooling (`.eslintrc.js`, `.prettierrc`, Husky setup)
- Dockerfiles and compose baseline

### 14.2 What to update immediately

1. Replace domain-specific SQL and schema names.
2. Remove hardcoded fallback secrets from code.
3. Update auth provider details (LDAP/SAML/NextAuth).
4. Register global exception filter and auth guards consistently.
5. Replace MariaDB SQL idioms with PostgreSQL-compatible SQL.

### 14.3 PostgreSQL migration quick steps

1. Refactor `DatabaseService` to `pg` pooling.
2. Introduce migration framework (`node-pg-migrate` or TypeORM migrations with actual data source file).
3. Port SQL functions/views used by repositories.
4. Run contract/integration tests against PostgreSQL.
5. Remove MariaDB-only env keys once stable.

### 14.4 Required environment variables (minimum)

```bash
NODE_ENV
PORT
API_PREFIX
APP_NAME
APP_VERSION
DATABASE_URL
REDIS_HOST
REDIS_PORT
JWT_SECRET
JWT_REFRESH_SECRET
NEXTAUTH_SECRET
CORS_ORIGIN
RATE_LIMIT_TTL
RATE_LIMIT_LIMIT
SWAGGER_ENABLED
```

### 14.5 Required services for new deployment

- API runtime (Node/Nest)
- PostgreSQL
- Redis
- Optional: LDAP/SAML IdP endpoints
- Optional: centralized logging + metrics backend

---

## 15) Best Practices

- Maintain strict module boundaries (`feature` vs `shared`).
- Keep controller thin; move orchestration to services.
- Centralize DB operations and retries in one database abstraction.
- Use parameterized SQL everywhere; avoid string-concatenated filters.
- Enforce global exception handling and consistent API response contracts.
- Keep environment-specific behavior in config, not inline conditionals.
- Apply security-by-default:
  - no hardcoded credentials
  - strong JWT secrets
  - production-safe debug defaults
  - strict TLS/certificate lifecycle management
- Keep CI quality gates mandatory (lint, test, build, security scan).
- Add integration tests for each repository query path during PostgreSQL porting.

---

## Appendix A) Representative API map (current)

```text
GET    /api/v1/
GET    /api/v1/info
GET    /api/v1/info/env
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh-token

GET    /api/v1/at-a-glance/filters
GET    /api/v1/at-a-glance/metrics
GET    /api/v1/at-a-glance/table
GET    /api/v1/at-a-glance/graph

GET    /api/v1/scenario-planning/scenarios
POST   /api/v1/scenario-planning/create-scenario
PATCH  /api/v1/scenario-planning/update-scenario
DELETE /api/v1/scenario-planning/delete-scenario

GET    /api/v1/optimized-baseline/baselines
POST   /api/v1/optimized-baseline/create-optimized-baseline
PATCH  /api/v1/optimized-baseline/update-optimized-baseline
DELETE /api/v1/optimized-baseline/delete-optimized-baseline
```

## Appendix B) Notes for engineers adopting this reference

- This repository is a strong modular-monolith baseline but currently DB-implementation-heavy toward MariaDB views/functions.
- For a clean greenfield PostgreSQL project, preserve the same module layering and cross-cutting architecture, but refactor SQL access early to avoid dialect lock-in.
- Treat this document as the architecture contract; align code reviews and CI checks against it.
