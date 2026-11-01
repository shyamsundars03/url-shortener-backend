# URL Shortener — Backend

A production-ready REST API for a URL shortening service. Built with **NestJS**, **TypeScript**, **MongoDB (Mongoose)**, and **JWT authentication**. Follows **Clean Architecture** principles with strict adherence to SOLID design principles.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Design Principles](#design-principles)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)

---

## How URL Shortening Works (Backend Side)

### Short Code Generation

Short codes are generated using the **`shortid`** library, which produces URL-safe alphanumeric strings (e.g. `aB3xY9`). The generation is wrapped in a **uniqueness loop** inside `UrlsService`:

```typescript
private async _generateUniqueShortId(): Promise<string> {
  let shortCode: string;
  let exists: UrlDocument | null;
  do {
    shortCode = shortid.generate();
    exists = await this._urlsRepository.findByShortUrl(shortCode);
  } while (exists);
  return shortCode;
}
```

This guarantees **collision-free codes** even as the database grows — if a generated code already exists, a new one is generated until a unique one is found.

### URL Validation (Business Rule)

Before saving, `UrlsService` validates that:
1. The URL uses `http` or `https` protocol (rejects `ftp://`, `javascript:`, etc.)
2. The user hasn't already shortened the exact same URL (prevents duplicates per user)

```typescript
private _isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

### Redirect Resolution

The `UrlRedirectController` handles all `GET /:shortUrl` requests:

```
User visits: http://localhost:3001/aB3xY9
     ↓
UrlRedirectController.redirect('aB3xY9')
     ↓
urlsService.findByShortUrl('aB3xY9') → UrlDocument
     ↓
urlsService.recordVisit(url.id)     → appends timestamp to lastVisited[]
     ↓
res.redirect(302, url.originalUrl)  → user lands on original site
```

### Visit Tracking

Every redirect appends an ISO timestamp to the `lastVisited` array in MongoDB:

```typescript
async recordVisit(id: string): Promise<void> {
  const url = await this._urlsRepository.findById(id);
  if (!url) return;
  const visited = Array.isArray(url.lastVisited) ? url.lastVisited : [];
  visited.push(new Date().toISOString());
  await this._urlsRepository.appendVisit(id, visited);
}
```

The frontend uses `lastVisited.length` to show the total visit count per link.

### Reserved Path Protection

The redirect controller calls `isReservedPath(shortUrl)` before resolving. This prevents short codes from accidentally matching known frontend/backend paths (`login`, `register`, `auth`, `health`, `link`, `api`, `404`, etc.) and causing unexpected redirects.

### Data Flow Summary

```
POST /link  →  UrlsController
              ↓
           UrlsService._isValidUrl()          ← validate
           UrlsService._generateUniqueShortId() ← generate unique code
           UrlsRepository.create({ shortUrl, originalUrl, userId })
              ↓
           Response: { shortUrl: 'aB3xY9', shortUrlFull: 'http://localhost:3001/aB3xY9' }

GET /:aB3xY9  →  UrlRedirectController
               ↓
            UrlsRepository.findByShortUrl('aB3xY9')
               ↓
            UrlsService.recordVisit(url.id)   ← track visit
               ↓
            302 redirect → url.originalUrl
```

---

## Overview

This backend powers a full-featured URL shortener platform:

- **User authentication** — email/password registration & login, Google OAuth 2.0
- **JWT session management** — short-lived access tokens + long-lived refresh tokens
- **URL management** — create short links, paginate & search, track visit history
- **Redirect service** — resolve short codes and redirect to original URLs

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript |
| Database | MongoDB via Mongoose |
| Auth | JWT (`@nestjs/jwt`), Passport.js |
| OAuth | Google OAuth 2.0 (`passport-google-oauth20`) |
| Validation | `class-validator`, `class-transformer` |
| URL IDs | `shortid` |
| Password hashing | `bcrypt` |
| Config | `@nestjs/config` |

---

## Architecture

This project follows a **Clean Architecture / Layered Architecture** pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Request                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Controller Layer                          │
│    AuthController          UrlsController                   │
│    (depends on IAuthService)  (depends on IUrlsService)     │
│    Returns ApiResponse<T> wrappers                          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│    AuthService (implements IAuthService)                    │
│    UsersService                                             │
│    UrlsService (implements IUrlsService)                    │
│    — Business logic, validation, token management —         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                           │
│    UsersRepository (implements IUsersRepository)            │
│    UrlsRepository  (implements IUrlsRepository)             │
│    — All Mongoose/MongoDB calls are isolated here —         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB                                │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Injection Chain

```
AuthController
  @Inject(AUTH_SERVICE) → AuthService
      → UsersService
          @Inject(USERS_REPOSITORY) → UsersRepository
              @InjectModel(User.name) → Mongoose Model

UrlsController / UrlRedirectController
  @Inject(URLS_SERVICE) → UrlsService
      @Inject(URLS_REPOSITORY) → UrlsRepository
          @InjectModel(Url.name) → Mongoose Model
```

---

## Project Structure

```
backend/
└── src/
    ├── main.ts                        # Bootstrap, CORS, pipes, filters
    ├── app.module.ts                  # Root module
    ├── app.controller.ts              # Health check endpoint
    │
    ├── common/                        # Shared utilities
    │   ├── constants/
    │   │   └── api-routes.constant.ts # AUTH_ROUTES, URL_ROUTES, APP_ROUTES
    │   ├── filters/
    │   │   └── http-exception.filter.ts # Global exception handler
    │   ├── repositories/
    │   │   ├── IBaseRepository.ts     # Generic CRUD interface
    │   │   └── base.repository.ts    # Abstract class: create, findById, findOne
    │   └── response/
    │       └── api-response.ts       # ApiResponse<T> wrapper: .ok(), .created(), .error()
    │
    ├── auth/                          # Authentication module
    │   ├── auth.module.ts             # DI token bindings, JWT config
    │   ├── auth.controller.ts         # POST /auth/register|login|refresh|logout, Google OAuth
    │   ├── auth.service.ts            # implements IAuthService
    │   ├── users.service.ts           # User CRUD + password hashing
    │   ├── dto/
    │   │   ├── register.dto.ts
    │   │   └── login.dto.ts
    │   ├── guards/
    │   │   └── jwt-auth.guard.ts
    │   ├── interfaces/
    │   │   ├── IAuthService.ts        # Interface + AUTH_SERVICE token
    │   │   └── IUsersRepository.ts   # Interface + USERS_REPOSITORY token
    │   ├── repositories/
    │   │   └── users.repository.ts   # Concrete: extends BaseRepository
    │   ├── schemas/
    │   │   └── user.schema.ts        # Mongoose User schema
    │   └── strategies/
    │       ├── jwt.strategy.ts
    │       └── google.strategy.ts
    │
    └── urls/                          # URL shortening module
        ├── urls.module.ts             # DI token bindings
        ├── urls.controller.ts         # UrlsController + UrlRedirectController
        ├── urls.service.ts            # implements IUrlsService
        ├── dto/
        │   └── create-url.dto.ts
        ├── interfaces/
        │   ├── IUrlsService.ts        # Interface + URLS_SERVICE token
        │   └── IUrlsRepository.ts    # Interface + URLS_REPOSITORY token
        ├── repositories/
        │   └── urls.repository.ts    # Concrete: extends BaseRepository
        └── schemas/
            └── url.schema.ts         # Mongoose Url schema
```

---

## Design Principles

### 1. Dependency Inversion Principle (DIP)
Controllers and services **never** import concrete classes directly. They depend on interfaces injected via custom tokens:

```typescript
// Controller depends on the interface, not the class
@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  private readonly _authService: IAuthService;

  constructor(
    @Inject(AUTH_SERVICE)
    authService: IAuthService,
  ) {
    this._authService = authService;
  }
}
```

### 2. Repository Pattern
All database operations are isolated in repository classes. Services never touch Mongoose models directly:

```typescript
// Service delegates all DB calls to the repository
async findByEmail(email: string): Promise<UserDocument | null> {
  return this._usersRepository.findByEmail(email);
}
```

### 3. Base Repository
`BaseRepository<TDoc, TCreate>` provides shared `create`, `findById`, and `findOne` to all domain repositories — no code duplication:

```typescript
export abstract class BaseRepository<TDoc extends Document, TCreate>
  implements IBaseRepository<TDoc, TCreate>
{
  protected readonly _model: Model<TDoc>;
  constructor(model: Model<TDoc>) { this._model = model; }

  async create(data: TCreate): Promise<TDoc> { ... }
  async findById(id: string): Promise<TDoc | null> { ... }
  async findOne(filter: Record<string, unknown>): Promise<TDoc | null> { ... }
}
```

### 4. Liskov Substitution Principle (LSP)
Repository overrides never change the behavioural contract. Password hashing is handled in `UsersService` (business layer) — the repository always receives already-hashed data.

### 5. Common Response Model
All JSON responses use `ApiResponse<T>`:

```typescript
// Success
return ApiResponse.ok(data, 'Login successful');
// Created
return ApiResponse.created(data, 'Short URL created');
// Error (used by global exception filter)
return ApiResponse.error('Unauthorised', 401);
```

Response shape:
```json
{
  "success": true,
  "message": "Login successful",
  "data": { "access_token": "...", "refresh_token": "..." }
}
```

### 6. Private Variable Convention
All private class members use `_` prefix and are declared at the class level with explicit constructor assignment:

```typescript
export class AuthService implements IAuthService {
  private readonly _usersService: UsersService;

  constructor(usersService: UsersService) {
    this._usersService = usersService;
  }
}
```

### 7. Route Constants
All route strings live in `common/constants/api-routes.constant.ts`:

```typescript
@Controller(AUTH_ROUTES.BASE)   // 'auth'
@Post(AUTH_ROUTES.REGISTER)     // 'register'
@Get(URL_ROUTES.LINK_COUNT)     // 'link/count'
```

---

## API Endpoints

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Register with name, email, password |
| `POST` | `/auth/login` | — | Login with email, password |
| `POST` | `/auth/refresh` | — | Refresh JWT tokens |
| `POST` | `/auth/logout` | JWT | Logout (client clears tokens) |
| `GET` | `/auth/google` | — | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | — | Google OAuth callback |

### URLs (`/link`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/link` | JWT | Create a short URL |
| `GET` | `/link` | JWT | List user's URLs (paginated, searchable) |
| `GET` | `/link/count` | JWT | Count user's total URLs |

### Redirect

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:shortUrl` | — | Redirect to original URL |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Server health check |

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/url-shortener

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend (for CORS and redirects)
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally or a cloud URI (MongoDB Atlas)

### Installation

```bash
cd backend
npm install
```

### Run in Development

```bash
npm run start:dev
```

Server starts at **http://localhost:3001**

### Run in Production

```bash
npm run build
npm run start:prod
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with hot-reload (watch mode) |
| `npm run start:prod` | Start compiled production build |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
