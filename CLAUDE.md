# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sora2Code.com is a full-stack web application that collects and displays Sora (OpenAI's video generation platform) invite codes from Reddit and Twitter. The project helps users discover and access Sora by aggregating invite codes shared across social media platforms. It consists of a Node.js/Express backend API and an Astro-based frontend with React islands, with an optional Cloudflare Workers deployment path.

## Architecture

### Backend Structure (Node.js + Express + Cloudflare Workers)

The backend has **dual deployment modes**:

1. **Traditional Node.js/Express Server** (`backend/src/index.ts`)
   - Express server with middleware (CORS, helmet, compression, rate limiting)
   - Prisma ORM with SQLite database
   - Redis for caching and rate limiting
   - RSA + AES encryption for API requests/responses

2. **Cloudflare Workers** (`backend/src/worker.ts`)
   - Hono framework for edge computing
   - D1 Database (SQLite), KV storage, optional R2 bucket
   - Scheduled cron jobs for Reddit code collection
   - Similar encryption and CORS handling as Express

**Key Backend Components:**
- **Routes** (`src/routes/`): API endpoints organized by resource (codes, auth, users, admin, crypto, health)
- **Services** (`src/services/`): Business logic for codes, auth, users, admin, email, Reddit, Twitter
- **Controllers** (`src/controllers/`): Request handlers
- **Middleware** (`src/middleware/`): Auth, rate limiting, RSA crypto, validation, error handling
- **Database** (`prisma/schema.prisma`): Prisma schema with models for Users, ShiftCodes, CodePlatforms, Favorites, CodeEvents, CodeReports, CodeVotes, etc.
- **Encryption**: RSA encryption for key exchange, AES-GCM for request/response encryption

### Frontend Structure (Astro + React + Tailwind)

- **Framework**: Astro v4 with hybrid rendering (SSR + SSG)
- **UI Library**: React v18 for interactive components
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages (via `@astrojs/cloudflare` adapter)
- **Architecture Pattern**: Islands architecture with React components in `src/components/islands/`
- **State Management**: Nanostores for client-side state
- **Encryption**: Client-side RSA/AES encryption matching backend (`src/lib/utils/rsa.ts`, `src/lib/utils/aes.ts`)

**Key Frontend Components:**
- **Pages** (`src/pages/`): Route-based pages (index, about, faq, guide, blog, etc.)
- **Islands** (`src/components/islands/`): Interactive React components (CodeList, CodeFilters, StatsDisplay, CodeVoteButton, CodeCopyButton)
- **Layouts** (`src/components/layout/`): Base layout templates
- **API Layer** (`src/lib/utils/api.ts`): Centralized API client with automatic encryption/decryption
- **State** (`src/lib/stores/`): Nanostores for shared state

### Database Schema (Prisma)

The application uses **SQLite** with Prisma ORM:

Key models:
- **User**: Authentication, roles (user/admin/super_admin), premium status
- **ShiftCode**: Sora invite codes with status, source (Reddit/Twitter), vote counts, copy counts
- **CodePlatform**: Platform availability (set to "All" for Sora since it's web-based)
- **Favorite**: User favorites
- **CodeEvent**: Activity tracking (copy, view, favorite, report)
- **CodeReport**: User-submitted code issues
- **CodeVote**: Upvote/downvote system (supports both authenticated and anonymous voting)
- **UserActivity**, **SystemLog**, **AdminLog**: Audit trails

**Note**: While the model is called `ShiftCode` (legacy from previous project), it now stores Sora invite codes.

### Encryption System

**Request/Response Encryption Flow:**
1. Client generates AES key and sends it in `X-AES-Key` header
2. Backend receives AES key and uses it to encrypt response data
3. Encrypted responses include `encrypted: true` flag, `data`, `iv`, and `authTag` fields
4. Client automatically decrypts responses using the same AES key
5. RSA is used for public key distribution via `/api/v1/crypto/public-key`

**Implementation:**
- Backend: `src/middleware/rsaCrypto.ts`, `src/utils/rsa.ts`, `src/utils/aes.ts`
- Frontend: `src/lib/utils/api.ts`, `src/lib/utils/rsa.ts`, `src/lib/utils/aes.ts`

### Code Collection System

The application automatically collects codes using:
- **Claude AI (Anthropic)**: Uses Claude's web search capabilities to find Sora invite codes from various sources (Reddit, Twitter/X, forums, blogs, etc.)
- **Cloudflare Workers Cron**: Scheduled jobs every 10 minutes (`worker.ts` scheduled handler)
- **Node.js Backend**: Configurable monitoring interval (default: 600 seconds / 10 minutes)

**Code Format**: 6-character alphanumeric codes (e.g., E9QPCR, 0N79AW, FGPEB8)

Code extraction uses Claude AI to intelligently search and extract invite codes with validation via `isValidInviteCode()` function to avoid false positives (excludes common English words like "THANKS", "PLEASE", etc.). Claude analyzes context to ensure codes are legitimate Sora invite codes.

## Common Development Commands

### Backend

```bash
# Development
npm run dev                    # Start dev server with nodemon
npm run dev:setup              # Run development setup script

# Database
npm run db:generate            # Generate Prisma client
npm run db:migrate             # Run database migrations
npm run db:deploy              # Deploy migrations to production
npm run db:studio              # Open Prisma Studio
npm run db:seed                # Seed database with sample data
npm run db:setup               # Setup database from scratch
npm run db:reset               # Reset database (WARNING: destructive)

# Testing & Quality
npm test                       # Run tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Generate test coverage report
npm run lint                   # Lint code
npm run lint:fix               # Lint and fix code
npm run typecheck              # Run TypeScript type checking

# Build & Deploy
npm run build                  # Build for production
npm start                      # Start production server
npm run start:prod             # Start with NODE_ENV=production

# Cloudflare Workers
npm run workers:dev            # Start Workers dev server
npm run workers:deploy         # Deploy to Cloudflare Workers
npm run workers:tail           # Tail Workers logs
npm run d1:create              # Create D1 database
npm run d1:migrate             # Run D1 migrations
npm run d1:query               # Execute D1 query

# Docker
npm run docker:build           # Build Docker image
npm run docker:run             # Run Docker container
npm run logs                   # View Docker logs
npm run stop                   # Stop Docker containers
npm run restart                # Restart Docker containers

# Health & Monitoring
npm run health                 # Check server health
```

### Frontend

```bash
# Development
npm run dev                    # Start Astro dev server (port 4321)
npm start                      # Alias for npm run dev

# Build & Preview
npm run build                  # Type check + build for production
npm run preview                # Preview production build locally

# Deploy
npm run deploy                 # Deploy to Cloudflare Pages via wrangler

# Other
npm run astro                  # Run Astro CLI commands
```

## Environment Configuration

### Backend (.env)

Key environment variables (see `backend/.env.example` for full list):

- **NODE_ENV**: `development` or `production`
- **PORT**: Server port (default: 3000)
- **DATABASE_URL**: SQLite database path (`file:./dev.db`)
- **REDIS_HOST/PORT/PASSWORD**: Redis configuration
- **JWT_SECRET**: JWT signing secret
- **ALLOWED_ORIGINS**: CORS allowed origins (comma-separated)
- **ANTHROPIC_API_KEY**: Claude API key for code collection
- **CLAUDE_CHECK_INTERVAL**: Monitoring interval in seconds (default: 600)
- **ENABLE_CLAUDE_MONITORING**: Enable/disable Claude monitoring

### Frontend

- **PUBLIC_API_BASE_URL**: Backend API URL (default: `http://localhost:8787`)

## Important Implementation Notes

### Code Format

Sora invite codes are **6-character alphanumeric** codes (e.g., `E9QPCR`, `0N79AW`). The extraction pattern is `/\b([A-Z0-9]{6})\b/g` with additional validation via `isLikelyInviteCode()` function.

### Code Sorting

In `backend/src/services/codes.service.ts`, codes are sorted by the specified field (createdAt, copyCount, etc.) and order (asc/desc). All codes are treated equally regardless of source.

### Platform Support

Unlike traditional gaming platforms, Sora is **web-based and platform-agnostic**. All codes should have platform set to "All" rather than specific platforms like PC/PlayStation/Xbox.

### Path Aliases

Backend uses TypeScript path aliases:
- `@/*`: Maps to `src/*`
- `@/types/*`: Maps to `src/types/*`
- `@/utils/*`: Maps to `src/utils/*`
- `@/services/*`: Maps to `src/services/*`
- `@/controllers/*`: Maps to `src/controllers/*`
- `@/middleware/*`: Maps to `src/middleware/*`
- `@/routes/*`: Maps to `src/routes/*`

### Authentication Middleware

- Protected routes require JWT authentication via `authMiddleware` (see `src/middleware/auth.ts`)
- Admin routes require admin/super_admin role
- Many code browsing endpoints are public (no auth required)

### Rate Limiting

Rate limiting is applied globally via `rateLimitMiddleware` using `rate-limiter-flexible` with Redis backend. Configuration is in `.env` (RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS).

### Testing

When running tests, the test environment uses an in-memory or separate test database. Configure `DATABASE_URL` for test environment if needed.

### Deployment Targets

The project supports multiple deployment scenarios:
1. **Traditional VPS/Server**: Express backend + Astro frontend
2. **Cloudflare**: Workers backend + Pages frontend
3. **Docker**: Containerized deployment with docker-compose

Choose deployment path based on infrastructure requirements. Cloudflare deployment is more cost-effective for low-traffic sites.

## Common Tasks

### Adding a New API Endpoint

1. Create route handler in `backend/src/routes/<resource>.routes.ts`
2. Add controller method in `backend/src/controllers/<resource>.controller.ts`
3. Implement service logic in `backend/src/services/<resource>.service.ts`
4. Add validation schema in `backend/src/schemas/<resource>.schema.ts` (using Zod)
5. Update route index in `backend/src/routes/index.ts`
6. If protected, apply `authMiddleware` to route

### Adding a New Frontend Page

1. Create `.astro` file in `frontend/src/pages/<page-name>.astro`
2. Use `BaseLayout` component for consistent layout
3. Add interactive components as React islands in `frontend/src/components/islands/`
4. Use `client:load` directive for islands that need immediate hydration

### Adding a New Database Model

1. Update `backend/prisma/schema.prisma`
2. Run `npm run db:generate` to update Prisma client
3. Create migration: `npm run db:migrate`
4. Update seed script if needed: `backend/prisma/seed.ts`

### Debugging Encryption Issues

If encryption/decryption fails:
1. Check that `X-AES-Key` header is being sent from frontend
2. Verify `rsaCrypto.getPublicKey()` is called on backend startup
3. Check console logs for `[API]` and `[Crypto]` prefixed messages
4. Test with `skipEncryption: true` in `apiRequest()` config to isolate encryption issues
5. Review `backend/src/middleware/rsaCrypto.ts` and `frontend/src/lib/utils/api.ts`
