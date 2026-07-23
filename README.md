<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">Base NestJS Prisma API</h1>

<p align="center">
  A production-ready RESTful API boilerplate built with <strong>NestJS 11</strong>, <strong>Prisma ORM</strong>, <strong>PostgreSQL</strong>, and <strong>Redis</strong>.<br/>
  Includes JWT authentication with token blacklisting, role-based access control, email notifications, pagination, and Docker support out of the box.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Swagger-Docs-85EA2D?style=flat-square&logo=swagger&logoColor=black" alt="Swagger" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <a href="https://deepwiki.com/bigmario/base-nestjs-prisma-api"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [Installation](#1-installation)
  - [Environment Configuration](#2-environment-configuration)
  - [Database Setup](#3-database-setup)
  - [Running the Application](#4-running-the-application)
- [Docker](#-docker)
- [API Documentation](#-api-documentation)
- [API Endpoints](#-api-endpoints)
- [Authentication & Authorization](#-authentication--authorization)
- [Database Schema](#-database-schema)
- [Pagination](#-pagination)
- [Email Service](#-email-service)
- [Caching](#-caching)
- [Path Aliases](#-path-aliases)
- [Testing](#-testing)
- [Code Quality](#-code-quality)
- [Available Scripts](#-available-scripts)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

---

## ✨ Features

- **JWT Authentication** — Login with Local Strategy + JWT tokens (8h expiry) with unique JTI per token
- **Token Blacklisting** — Secure logout via Redis-based JWT revocation by JTI with automatic TTL expiry
- **Role-Based Access Control (RBAC)** — Decorator-driven authorization (`SUPER_ADMIN`, `ADMIN`, `PROGRAMADOR`, `VENDEDOR`)
- **Password Recovery** — Full email-based password recovery flow with time-limited tokens
- **Session Management** — Separated user/session model with login tracking and status management
- **Prisma ORM** — Type-safe database access with migrations, seeding, soft deletes, and transactions
- **Swagger / OpenAPI** — Auto-generated interactive API documentation with OAuth2 password flow
- **Email Notifications** — Transactional emails via Nodemailer with Handlebars templates
- **Redis Caching** — Resilient cache-aside layer with automatic invalidation, prefix-based key management, and graceful degradation (fallback to DB when Redis is unavailable)
- **Pagination** — Reusable pagination service with navigation URLs (first, last, next, previous)
- **Request Validation** — DTO-based validation with `class-validator` and `class-transformer`
- **Base Repository** — Generic repository pattern with built-in search filtering, pagination, soft deletes, and **cached query methods** (`findOneCached`, `findAllCached`, `invalidateModelCache`)
- **Docker Ready** — Multi-stage Dockerfile with `docker-compose` for development and production
- **Path Aliases** — Clean imports via `@core/*`, `@auth/*`, `@user/*`, `@utils`
- **File Uploads** — Multer-compatible file rename utility using nanoid

---

## 🛠 Tech Stack

| Category         | Technology                                                             |
| ---------------- | ---------------------------------------------------------------------- |
| **Framework**    | [NestJS 11](https://nestjs.com/)                                       |
| **Language**     | [TypeScript 5.7](https://www.typescriptlang.org/)                      |
| **ORM**          | [Prisma 6](https://www.prisma.io/)                                     |
| **Database**     | [PostgreSQL 16](https://www.postgresql.org/)                           |
| **Cache**        | [Redis 7](https://redis.io/) via [cache-manager](https://github.com/node-cache-manager/node-cache-manager) + [@keyv/redis](https://github.com/jaredwray/keyv) |
| **Auth**         | [Passport.js](http://www.passportjs.org/) (Local + JWT strategies)     |
| **Email**        | [Nodemailer](https://nodemailer.com/) + [Handlebars](https://handlebarsjs.com/) templates |
| **Validation**   | [class-validator](https://github.com/typestack/class-validator)        |
| **Docs**         | [Swagger / OpenAPI](https://swagger.io/)                               |
| **Testing**      | [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) |
| **Containers**   | [Docker](https://www.docker.com/) + Docker Compose                     |
| **Linting**      | [ESLint 9](https://eslint.org/) (flat config) + [Prettier](https://prettier.io/) |
| **Runtime**      | [Node.js ≥ 22](https://nodejs.org/)                                    |

---

## 🏗 Architecture

The project follows a **modular layered architecture** with the Repository pattern:

```
Request → Guards (JWT/Local/Roles) → Controller → Service → Repository → Prisma → PostgreSQL
                                         ↕              ↕            ↕
                                      DTOs/Pipes    EmailService   BaseRepository
                                                                   ↕         ↕
                                                           RedisCacheService  PaginationService
                                                                   ↕
                                                                 Redis
```

**Key architectural decisions:**

- **Controllers** handle HTTP concerns only (routing, request/response mapping)
- **Services** contain business logic and orchestrate operations
- **Repositories** extend `BaseRepository` and encapsulate all database access via Prisma
- **BaseRepository** provides generic `findOne`, `findAll`, `findOneCached`, `findAllCached`, `softDelete`, `invalidateModelCache`, `buildFilters`, and pagination support
- **DTOs** define and validate request/response shapes with decorators
- **Guards** enforce authentication (JWT + Local) and role-based authorization
- **Session/User separation** — Authentication credentials live in `session`, personal data in `user`
- **Transactions** — User creation wraps session + user records in Prisma interactive transactions

---

## 📁 Project Structure

```
base-nestjs-prisma-api/
├── prisma/
│   ├── migrations/                    # Database migration history
│   ├── seeder/
│   │   └── seed.ts                    # Database seed script (roles, statuses, admin)
│   └── schema.prisma                  # Prisma schema (models, enums, relations)
├── src/
│   ├── core/                          # Shared cross-cutting infrastructure
│   │   ├── dtos/                      # Base DTOs (BaseCreateBodyDto, BaseUpdateBodyDto, BaseQueryParams)
│   │   ├── email/                     # Email module
│   │   │   ├── services/              # EmailService (confirmation, recovery)
│   │   │   └── templates/             # Handlebars email templates
│   │   │       └── confirm-email.hbs
│   │   ├── pagination/                # Pagination module
│   │   │   ├── services/              # PaginationService (URL builder, paginator)
│   │   │   ├── interfaces/            # Paginated result interface
│   │   │   └── types/                 # Pagination types
│   │   ├── prisma/                    # Prisma module
│   │   │   ├── services/              # PrismaService (connection lifecycle)
│   │   │   ├── repositories/          # BaseRepository (generic CRUD, search, soft delete)
│   │   │   └── types/                 # Prisma utility types
│   │   └── types/                     # Shared types (FindAllOptions, FindManyArgs)
│   ├── modules/
│   │   ├── auth/                      # Authentication module
│   │   │   ├── constants/             # Route constants
│   │   │   ├── controllers/           # Auth endpoints (login, logout, recovery, etc.)
│   │   │   ├── decorators/            # @Public(), @Roles()
│   │   │   ├── dto/                   # LoginDto, RecoveryDto, ResetPassDto
│   │   │   ├── guards/               # JwtAuthGuard, LocalAuthGuard, RolesGuard
│   │   │   ├── interfaces/            # IRequest interface
│   │   │   ├── models/               # Role enum
│   │   │   ├── repositories/          # Auth DB operations
│   │   │   ├── services/              # Auth business logic (JWT, bcrypt, recovery)
│   │   │   └── strategies/            # Passport Local + JWT strategies
│   │   └── user/                      # User management module
│   │       ├── constants/             # Route constants
│   │       ├── controllers/           # User CRUD endpoints + roles/statuses
│   │       ├── dtos/                  # CreateUserDto, UpdateUserDto, QueryParams
│   │       ├── repositories/          # User DB operations (transactions)
│   │       ├── services/              # User business logic
│   │       └── types/                 # User-specific types
│   ├── utils/                         # Utility functions
│   │   ├── files-uploads.utils.ts     # Multer file rename with nanoid
│   │   └── objects.utils.ts           # Object helpers (isEmptyObject)
│   ├── app.module.ts                  # Root module (config, cache, guards)
│   ├── app.controller.ts             # Root greeting endpoint
│   └── main.ts                        # Bootstrap, Swagger, validation
├── test/                              # E2E test files
├── docker-compose.yaml                # Docker services (dev, prod, postgres, redis)
├── Dockerfile                         # Multi-stage Docker build (Node 22)
├── wait-for-postgres.sh               # TCP wait-for script for Docker
├── .env.example                       # Environment variables template
├── nest-cli.json                      # NestJS CLI + Swagger plugin config
├── tsconfig.json                      # TypeScript config with path aliases
└── package.json                       # Dependencies, scripts, Jest config
```

---

## 📌 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** ≥ 22.x — [Download](https://nodejs.org/)
- **npm** ≥ 10.x (comes with Node.js)
- **PostgreSQL** 16+ — [Download](https://www.postgresql.org/download/) (or use Docker)
- **Redis** 7+ — [Download](https://redis.io/download/) (or use Docker)
- **Docker** & **Docker Compose** *(optional)* — [Download](https://www.docker.com/get-started)

---

## 🚀 Getting Started

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/bigmario/base-nestjs-prisma-api.git
cd base-nestjs-prisma-api

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment file and fill in the values:

```bash
cp .env.example .env
```

#### Environment Variables

| Variable             | Category  | Description                              | Example Value                         |
| -------------------- | --------- | ---------------------------------------- | ------------------------------------- |
| `HOST`               | App       | Application hostname                     | `localhost`                           |
| `LOCAL_PORT`         | App       | Application port                         | `3000`                                |
| `PROTOCOL`           | App       | Protocol (http/https)                    | `http`                                |
| `BASE_URL`           | App       | Auto-composed from above *(do not edit)* | `${PROTOCOL}://${HOST}:${LOCAL_PORT}` |
| `DB_HOST`            | Database  | PostgreSQL host                          | `localhost`                           |
| `DB_ENGINE`          | Database  | Database engine                          | `postgresql`                          |
| `DB_NAME`            | Database  | Database name                            | `base_nest`                           |
| `DB_PORT`            | Database  | PostgreSQL port                          | `5432`                                |
| `DB_USER`            | Database  | Database user                            | `postgres`                            |
| `DB_PASSWORD`        | Database  | Database password                        | `postgres`                            |
| `DB_CONNECT_TIMEOUT` | Database  | Connection timeout (seconds)             | `300`                                 |
| `DATABASE_URL`       | Database  | Auto-composed Prisma URL *(do not edit)* | —                                     |
| `JWT_SECRET`         | Auth      | JWT signing secret                       | `my-super-secret-key`                 |
| `REDIS_HOST`         | Cache     | Redis server hostname                    | `localhost`                           |
| `REDIS_PORT`         | Cache     | Redis server port                        | `6379`                                |
| `REDIS_USERNAME`     | Cache     | Redis username *(optional)*              | —                                     |
| `REDIS_PASSWORD`     | Cache     | Redis password *(optional)*              | —                                     |
| `MASTER_PASS`        | Seed      | Master admin password for seeding        | `MyAdminP@ss123`                      |
| `SMTP_HOST`          | Email     | SMTP server host                         | `smtp.gmail.com`                      |
| `SMTP_SECURE`        | Email     | Use secure connection                    | `true`                                |
| `SMTP_PORT`          | Email     | SMTP port                                | `465`                                 |
| `SMTP_USER`          | Email     | SMTP authentication user                 | `user@gmail.com`                      |
| `SMTP_PASS`          | Email     | SMTP authentication password             | `app-password`                        |
| `SMTP_FROM`          | Email     | Default sender address                   | `noreply@example.com`                 |
| `SMTP_TO`            | Email     | Default recipient address                | `admin@example.com`                   |

> ⚠️ **Important:** Change `JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`, and `MASTER_PASS` to secure values in production environments.

> 💡 **Note:** `BASE_URL` and `DATABASE_URL` are auto-composed using [variable expansion](https://docs.nestjs.com/techniques/configuration#expandable-variables). You only need to fill in the individual component variables.

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (roles, statuses, admin user)
npx prisma db seed
```

The seed script creates the following data inside a transaction:

| Data               | Details                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| **Session Statuses** | `ACTIVO` (id=1), `BANEADO` (id=2)                                       |
| **Session Type**   | `User` (id=1)                                                              |
| **Roles**          | `Super Admin` (1), `Admin` (2), `Programador` (3), `Vendedor` (4)          |
| **Admin User**     | email: `admin@mail.com`, password: value of `MASTER_PASS`, role: Super Admin |

### 4. Running the Application

```bash
# Development (watch mode)
npm run start:dev

# Development with auto-migration and seed
npm run start-with-prisma:debug

# Standard start
npm run start

# Production
npm run build
npm run start:prod
```

Once running, the API will be available at:

- **API Base URL:** `http://localhost:{LOCAL_PORT}`
- **Swagger Docs:** `http://localhost:{LOCAL_PORT}/docs`

---

## 🐳 Docker

The project includes a full Docker setup with multi-stage builds using Node.js 22 Alpine.

### Services

| Service      | Image / Build                       | Port(s)       | Description                                    |
| ------------ | ----------------------------------- | ------------- | ---------------------------------------------- |
| **dev**      | Dockerfile (target: development)    | `3000:3000`   | API with hot-reload + auto-migration + seed    |
| **prod**     | Dockerfile (target: production)     | `3000:3000`   | Production-optimized API + migration + seed    |
| **postgres** | `postgres:16-alpine`                | `5432:5432`   | PostgreSQL database with persistent volume     |
| **redis**    | `redis:7-alpine`                    | `6380:6379`   | Redis cache (external port 6380)               |

> 💡 All services are connected via a `main-network` bridge network. The `wait-for-postgres.sh` script ensures the app starts only after PostgreSQL is ready.

### Commands

```bash
# Start development stack (API + Postgres + Redis)
docker-compose up dev

# Start production-like stack
docker-compose up prod

# Run in detached mode
docker-compose up -d dev

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ destroys database data)
docker-compose down -v

# Rebuild images after dependency changes
docker-compose build --no-cache dev
```

---

## 📖 API Documentation

Interactive Swagger documentation is automatically generated and available at:

```
http://localhost:{LOCAL_PORT}/docs
```

The documentation includes:
- All available endpoints with request/response schemas
- **OAuth2 Password Flow** authentication (login directly from Swagger UI)
- Bearer token authorization (click **Authorize** 🔓)
- Auto-generated DTO schemas from class-validator decorators and JSDoc comments

---

## 📡 API Endpoints

### Root

| Method | Endpoint | Access     | Description          |
| ------ | -------- | ---------- | -------------------- |
| `GET`  | `/`      | 🌐 Public  | Greeting endpoint     |

### Authentication (`/auth`)

| Method   | Endpoint              | Access            | Description                          |
| -------- | --------------------- | ----------------- | ------------------------------------ |
| `POST`   | `/auth/login`         | 🌐 Public          | Login with email/password (OAuth2)   |
| `GET`    | `/auth/test`          | 🔒 Bearer          | Test endpoint — returns JWT payload  |
| `GET`    | `/auth/me`            | 🔒 Bearer          | Get current user profile             |
| `DELETE` | `/auth/logout`        | 🔒 Bearer          | Logout (blacklists token in Redis)   |
| `POST`   | `/auth/recovery`      | 🌐 Public          | Request password recovery email      |
| `POST`   | `/auth/reset-password`| 🌐 Public          | Reset password with recovery token   |

### Users (`/users`)

| Method   | Endpoint              | Access                       | Description                    |
| -------- | --------------------- | ---------------------------- | ------------------------------ |
| `GET`    | `/users`              | 🔒 Bearer                    | List all users (paginated)     |
| `POST`   | `/users`              | 🔒 ADMIN / SUPER_ADMIN       | Create a new user              |
| `GET`    | `/users/roles`        | 🔒 Bearer                    | List all user roles            |
| `GET`    | `/users/statuses`     | 🔒 Bearer                    | List all user statuses         |
| `GET`    | `/users/:id`          | 🔒 Bearer                    | Get user by ID                 |
| `PATCH`  | `/users/:id`          | 🔒 ADMIN / SUPER_ADMIN       | Update user                    |
| `DELETE` | `/users/:id`          | 🔒 ADMIN / SUPER_ADMIN       | Soft delete user               |

---

## 🔐 Authentication & Authorization

### Authentication Flow

The API uses a **dual-strategy Passport.js** setup:

1. **Local Strategy** — Validates email + password on login
2. **JWT Strategy** — Validates Bearer tokens on protected routes

```
POST /auth/login (email + password)
        ↓ LocalAuthGuard
        ↓ Validate credentials (bcrypt compare)
        ↓ Generate JWT (8h expiry, unique JTI via nanoid)
        ↓ Return { access_token, ...userInfo }

Subsequent requests:
        → Authorization: Bearer <token>
        → JwtAuthGuard checks:
           1. Is route @Public()? → Allow
           2. Is token JTI blacklisted in Redis? → 401
           3. Is token valid? → Allow

DELETE /auth/logout
        → Store JTI in Redis with remaining TTL
        → Token is revoked immediately
```

### Role-Based Access Control

JWT auth is applied **globally** via `APP_GUARD`. Use decorators to control access:

```typescript
// Public route — bypasses JWT authentication
@Public()
@Get()
greet() {
  return 'nice to greet you!, human';
}

// Role-restricted route
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Post()
createUser(@Body() dto: CreateUserDto) { ... }
```

### Available Roles

| Role           | ID  | Description                 |
| -------------- | --- | --------------------------- |
| `SUPER_ADMIN`  | 1   | Full system access          |
| `ADMIN`        | 2   | Administrative access       |
| `PROGRAMADOR`  | 3   | Developer access            |
| `VENDEDOR`     | 4   | Sales access                |

### Password Recovery Flow

```
POST /auth/recovery { email }
        ↓ Generate 15-min JWT recovery token
        ↓ Store token in session.recoveryToken
        ↓ Send recovery email with link

POST /auth/reset-password { token, newPassword }
        ↓ Verify JWT token
        ↓ Validate against stored recoveryToken
        ↓ Hash new password (bcrypt, 10 rounds)
        ↓ Update session, clear recoveryToken
```

---

## 🗄 Database Schema

The database uses a **session-based user model** where authentication data and personal data are separated:

### Entity Relationship Diagram

```
┌─────────────────┐     1:1     ┌──────────────────┐
│      user        │◄───────────│     session        │
├─────────────────┤             ├──────────────────┤
│ id (BigInt PK)  │             │ id (BigInt PK)   │
│ name            │             │ email (unique)   │
│ lastName        │             │ password         │
│ identityCard    │             │ lastAccess       │
│ identityPrefix  │             │ timesLoggedIn    │
│ primaryPhone    │             │ recoveryToken    │
│ secondaryPhone? │             │ typeId FK────────│──► session_type
│ imgUrl?         │             │ rolId FK─────────│──► session_rol
│ sessionId FK────│─────────────│ statusId FK──────│──► session_status
│ createdAt       │             └──────────────────┘
│ updatedAt       │
│ deletedAt?      │        ┌──────────────────┐
└─────────────────┘        │  session_type     │
                           ├──────────────────┤
┌──────────────────┐       │ id (SmallInt PK) │
│  session_rol     │       │ name             │
├──────────────────┤       │ description?     │
│ id (SmallInt PK) │       │ createdAt        │
│ name             │       │ updatedAt        │
│ description?     │       │ deletedAt?       │
│ typeId FK────────│──────►└──────────────────┘
└──────────────────┘
                           ┌──────────────────┐
                           │ session_status    │
                           ├──────────────────┤
                           │ id (SmallInt PK) │
                           │ name             │
                           │ description?     │
                           └──────────────────┘
```

### Identity Prefix Enum

```prisma
enum identityPrefix {
  J   // Jurídica
  G   // Gubernamental
  V   // Venezolana
  E   // Extranjera
  C   // Comunal
}
```

> 💡 **Soft Deletes:** The `user`, `session_type` models use a `deletedAt` field for soft deletes, preserving data integrity while logically removing records.

---

## 📄 Pagination

The API provides standardized pagination across all list endpoints:

### Query Parameters

| Parameter | Type     | Default | Description        |
| --------- | -------- | ------- | ------------------ |
| `page`    | `number` | —       | Page number        |
| `limit`   | `number` | —       | Items per page     |
| `search`  | `string` | —       | Text search filter *(some endpoints)* |

### Paginated Response Format

```json
{
  "data": [ ... ],
  "meta": {
    "totalItems": 150,
    "page": 2,
    "limit": 10,
    "previousPageUrl": "http://localhost:3000/users?page=1&limit=10",
    "nextPageUrl": "http://localhost:3000/users?page=3&limit=10",
    "firstPageUrl": "http://localhost:3000/users?page=1&limit=10",
    "lastPageUrl": "http://localhost:3000/users?page=15&limit=10"
  }
}
```

The `PaginationService` automatically builds navigation URLs using the `BASE_URL` configuration.

---

## 📧 Email Service

The API includes a transactional email service powered by **Nodemailer** and **Handlebars** templates:

- **Confirmation emails** — Sent using the `confirm-email.hbs` template
- **Password recovery** — HTML emails with recovery links

### Configuration

Email is configured via SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, etc.). The `nest-cli.json` is configured to copy Handlebars templates to the `dist/` directory during build.

### Adding New Templates

1. Create a `.hbs` file in `src/core/email/templates/`
2. Add a new method to `EmailService` to send the template
3. Templates are automatically copied to `dist/` during builds (via `nest-cli.json` asset config)

---

## 💾 Caching

The project implements a **resilient cache-aside layer** via `@nestjs/cache-manager` v3 + `@keyv/redis`, integrated directly into `BaseRepository` for automatic adoption by all modules.

### Architecture Overview

```
src/core/cache/
├── redis-cache.module.ts          # Global CacheModule config (12-Factor App)
├── redis-cache.service.ts         # Resilient wrapper with graceful degradation
├── redis-cache.service.spec.ts    # Unit tests
├── index.ts                       # Barrel exports
├── decorators/
│   └── cache.decorators.ts        # @Cacheable() and @CacheEvict() decorators
└── interceptors/
    └── http-cache.interceptor.ts  # HTTP-level cache-aside + eviction interceptor
```

### Key Features

- **Graceful Degradation & Fast Failover** — If Redis is down or unreachable, connection attempts fail in **500ms** and individual cache calls time out in **200ms** (`withTimeout`). All requests transparently fall through to PostgreSQL without hanging Swagger or client requests.
- **BaseRepository Integration** — Any module extending `BaseRepository` inherits cached query methods (`findOneCached`, `findAllCached`, `invalidateModelCache`) out of the box.
- **Automatic Invalidation** — Mutations (`POST`, `PATCH`, `DELETE`) invalidate relevant cache keys via prefix-based eviction.
- **Declarative & Programmatic Options** — Supports both controller-level decorators (`@Cacheable()`, `@CacheEvict()`) and repository-level methods.
- **12-Factor App Config** — Connection supports `REDIS_URL` (full URI) or individual `REDIS_HOST`/`REDIS_PORT`/`REDIS_USERNAME`/`REDIS_PASSWORD` variables.
- **JWT Token Blacklisting** — Also used for secure logout via Redis-based JWT revocation by JTI.

### Cache Key Naming Convention

```
api:{module}:{resource}:{suffix}
```

| Pattern | Example | Description |
| --- | --- | --- |
| `api:{module}:{catalog}` | `api:user:roles` | Static catalog data |
| `api:{module}:list:{query}` | `api:user:list:page=1&limit=10` | Paginated list with query hash |
| `api:{module}:item:{id}` | `api:user:item:42` | Single entity by ID |

### TTL Configuration

| Endpoint | TTL | Rationale |
| --- | --- | --- |
| `GET /users/roles` | 1 hour | Very low volatility (catalog) |
| `GET /users/statuses` | 1 hour | Very low volatility (catalog) |
| `GET /users` | 2 minutes | Medium-high volatility (paginated list) |
| `GET /users/:id` | 10 minutes | Medium volatility (single entity) |

### Usage in New Modules

#### Option A: Repository Level (Recommended)

Any new repository extending `BaseRepository` automatically gets cache support:

```typescript
// 1. Repository — inject RedisCacheService
@Injectable()
export class ProductRepository extends BaseRepository {
  constructor(
    public readonly prismaService: PrismaService,
    paginationService: PaginationService,
    cacheService: RedisCacheService,
  ) {
    super(paginationService, cacheService);
  }
}

// 2. Service — use cached methods
const products = await this.productRepository.findAllCached(
  this.productRepository.prismaService.product,
  { paginate: true, resourceBaseUrl: '/products', findManyArgs },
  { keyPrefix: 'api:product:list', keySuffix: 'page=1&limit=10', ttl: 300_000 },
);

// 3. Invalidate after mutations
await this.productRepository.invalidateModelCache('api:product:list');
await this.productRepository.invalidateModelCache('api:product:item', productId);
```

#### Option B: Controller Level (Declarative Decorators)

Alternatively, decorate controller methods using `@Cacheable` and `@CacheEvict` with `HttpCacheInterceptor`:

```typescript
@UseInterceptors(HttpCacheInterceptor)
@Controller('products')
export class ProductController {

  @Cacheable({ keyPrefix: 'api:product:list', ttl: 300_000 })
  @Get()
  getAllProducts() { ... }

  @CacheEvict(['api:product:list'])
  @Post()
  createProduct() { ... }
}
```

### Health Check Endpoint (`GET /health`)

A public health check endpoint is available at `GET /health` to monitor infrastructure status:

- **Online (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "info": {
      "database": { "status": "up", "latencyMs": 1 },
      "redis": { "status": "up", "latencyMs": 2 }
    },
    "timestamp": "2026-07-23T23:07:25.851Z"
  }
  ```
- **Redis Outage / Degraded (`200 OK`)**:
  ```json
  {
    "status": "degraded",
    "info": {
      "database": { "status": "up", "latencyMs": 1 },
      "redis": { "status": "degraded" }
    },
    "timestamp": "2026-07-23T23:07:20.702Z"
  }
  ```

### Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `REDIS_URL` | Full Redis connection string (takes precedence) | No |
| `REDIS_HOST` | Redis hostname | Yes (if no `REDIS_URL`) |
| `REDIS_PORT` | Redis port | Yes (if no `REDIS_URL`) |
| `REDIS_USERNAME` | Redis username | No |
| `REDIS_PASSWORD` | Redis password | No |

---

## 🔗 Path Aliases

The project uses TypeScript path aliases for clean imports:

| Alias       | Maps To                    | Usage                                  |
| ----------- | -------------------------- | -------------------------------------- |
| `@core/*`   | `src/core/*`               | Shared DTOs, services, repositories    |
| `@auth/*`   | `src/modules/auth/*`       | Auth module internals                  |
| `@user/*`   | `src/modules/user/*`       | User module internals                  |
| `@utils*`   | `src/utils/*`              | Utility functions                      |

**Example:**

```typescript
import { Public } from '@auth/decorators/public.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { BaseRepository } from '@core/prisma/repositories/base.repository';
import { PaginationService } from '@core/pagination/services/pagination.service';
```

---

## 🧪 Testing

The project uses **Jest** as the testing framework with **Supertest** for E2E tests. 

### Strategy
- **Unit Tests**: Place spec files (`*.spec.ts`) in the `src/` directory alongside the implementation. Services, controllers, repositories, guards, and strategies are unit tested in isolation using mock utilities.
- **E2E Tests**: Place E2E spec files (`*.e2e-spec.ts`) in the `test/` directory. These tests run HTTP requests directly against a compiled test application.
- **No external dependencies**: Both Unit and E2E tests utilize mock factories (`PrismaService`, `CACHE_MANAGER`, `EmailService`) to guarantee tests run out-of-the-box locally or in CI/CD pipelines without needing a running PostgreSQL or Redis instance.

### Commands

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run a specific unit test file
npm run test -- src/modules/auth/services/auth.service.spec.ts

# Run tests matching a name pattern
npm run test -- -t "should return user profile"

# Run E2E tests (completely isolated via mock providers)
npm run test:e2e

# Run a specific E2E test
npm run test:e2e -- test/auth.e2e-spec.ts

# Generate coverage report
npm run test:cov

# Debug tests (attach inspector)
npm run test:debug
```

---

## ✅ Code Quality

### Linting

```bash
# Run ESLint with auto-fix
npm run lint
```

The project uses **ESLint 9** with flat config (`eslint.config.mjs`), extending:
- `eslint.configs.recommended`
- `typescript-eslint.configs.recommendedTypeChecked`
- `eslint-plugin-prettier/recommended`

### Formatting

```bash
# Format all source files with Prettier
npm run format
```

### Prettier Configuration

| Rule             | Value   |
| ---------------- | ------- |
| Single Quotes    | `true`  |
| Trailing Commas  | `all`   |
| Tab Width        | `2`     |

---

## 📜 Available Scripts

### Application

| Script                       | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `npm run start`              | Start the application                                    |
| `npm run start:dev`          | Start with hot-reload (development)                      |
| `npm run start:debug`        | Start with debugger attached                             |
| `npm run start:prod`         | Start production build (`node dist/main`)                |
| `npm run start-with-prisma:debug` | Migrate + seed + start debug mode                   |
| `npm run build`              | Compile TypeScript to `dist/` (cleans first via prebuild)|

### Docker

| Script                           | Description                                          |
| -------------------------------- | ---------------------------------------------------- |
| `npm run start:docker-dev`       | Docker dev: migrate + seed + start:dev               |
| `npm run start:docker-prod`      | Docker prod: migrate deploy + seed (compiled) + start|

### Quality

| Script                | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run lint`        | Lint and auto-fix with ESLint            |
| `npm run format`      | Format code with Prettier                |
| `npm run test`        | Run unit tests                           |
| `npm run test:watch`  | Run tests in watch mode                  |
| `npm run test:cov`    | Run tests with coverage report           |
| `npm run test:debug`  | Run tests with debugger                  |
| `npm run test:e2e`    | Run end-to-end tests                     |

### Prisma

| Command                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npx prisma generate`       | Generate Prisma Client from schema       |
| `npx prisma migrate dev`    | Create and apply development migrations  |
| `npx prisma migrate deploy` | Apply pending migrations (production)    |
| `npx prisma db seed`        | Seed the database                        |
| `npx prisma studio`         | Open Prisma Studio (visual DB browser)   |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | Usage                          |
| ----------- | ------------------------------ |
| `feat:`     | New feature                    |
| `fix:`      | Bug fix                        |
| `docs:`     | Documentation changes          |
| `style:`    | Formatting, no code change     |
| `refactor:` | Code refactoring               |
| `test:`     | Adding or updating tests       |
| `chore:`    | Maintenance tasks              |

---

## 👤 Author

**Mario Castro** — [mariocastro.pva@gmail.com](mailto:mariocastro.pva@gmail.com)

- GitHub: [@bigmario](https://github.com/bigmario)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ using <a href="https://nestjs.com/">NestJS</a> + <a href="https://www.prisma.io/">Prisma</a>
</p>
