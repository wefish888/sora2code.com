# sora2 code Backend API

A robust Node.js backend API for the sora2 code platform, providing comprehensive services for sora2 shift codes management, user authentication, and Reddit integration.

## Features

- 🔐 **Complete Authentication System** - JWT-based auth with refresh tokens, email verification, password reset
- 🎮 **Shift Codes Management** - CRUD operations, search, filtering, favorites, and copy tracking
- 🤖 **Reddit Integration** - Automated monitoring of r/Borderlands for new shift codes
- 📧 **Email Services** - Welcome emails, notifications, password reset using SMTP
- 🚦 **Rate Limiting** - Redis-based rate limiting with different tiers
- 💾 **Caching** - Multi-layer caching strategy with Redis
- 👥 **User Management** - Profiles, preferences, premium subscriptions
- 🛡️ **Admin Panel** - Complete admin interface for code and user management
- 📊 **Analytics** - Usage tracking and reporting
- 🏥 **Health Monitoring** - Comprehensive health checks and logging

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM (development) / PostgreSQL (production)
- **Cache**: Redis with ioredis
- **Authentication**: JWT with bcrypt
- **Email**: Nodemailer (SMTP)
- **Validation**: Zod
- **Logging**: Winston with daily rotation
- **Security**: Helmet, CORS, rate limiting

## Project Structure

```
src/
├── controllers/         # Request handlers
│   ├── admin.controller.ts
│   ├── auth.controller.ts
│   ├── codes.controller.ts
│   ├── health.controller.ts
│   └── user.controller.ts
├── middleware/         # Express middleware
│   ├── auth.ts
│   ├── errorHandler.ts
│   ├── notFoundHandler.ts
│   ├── rateLimiter.ts
│   └── validation.ts
├── routes/            # API route definitions
│   ├── admin.routes.ts
│   ├── auth.routes.ts
│   ├── codes.routes.ts
│   ├── health.routes.ts
│   ├── index.ts
│   └── user.routes.ts
├── services/          # Business logic
│   ├── admin.service.ts
│   ├── auth.service.ts
│   ├── codes.service.ts
│   ├── email.service.ts
│   ├── reddit.service.ts
│   └── user.service.ts
├── schemas/           # Validation schemas
│   ├── admin.schema.ts
│   ├── auth.schema.ts
│   ├── codes.schema.ts
│   └── user.schema.ts
├── utils/             # Utilities
│   ├── database.ts
│   ├── logger.ts
│   └── redis.ts
└── index.ts           # Application entry point
```

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `POST /verify-email` - Verify email address
- `POST /resend-verification` - Resend verification email

### Shift Codes (`/api/v1/codes`)
- `GET /` - List codes with filtering and pagination
- `GET /stats` - Global statistics
- `GET /trending` - Trending codes
- `GET /:id` - Get code details
- `POST /:id/copy` - Record code copy
- `POST /:id/report` - Report code issue
- `POST /:id/favorite` - Toggle favorite status
- `GET /favorites/my` - User's favorite codes
- `GET /search` - Search codes

### User Management (`/api/v1/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `PUT /password` - Change password
- `DELETE /account` - Delete account
- `GET /stats` - User statistics
- `GET /activity` - User activity history
- `POST /upgrade` - Upgrade to premium
- `POST /downgrade` - Cancel premium

### Admin Panel (`/api/v1/admin`)
- `GET /codes` - All codes (admin view)
- `POST /codes` - Create code
- `PUT /codes/:id` - Update code
- `DELETE /codes/:id` - Delete code
- `POST /codes/batch-update` - Batch update codes
- `POST /codes/batch-delete` - Batch delete codes
- `GET /users` - All users
- `PUT /users/:id` - Update user
- `POST /users/:id/ban` - Ban user
- `POST /users/:id/unban` - Unban user
- `GET /dashboard` - Admin dashboard
- `GET /analytics` - Analytics data
- `GET /reddit/status` - Reddit monitor status
- `POST /reddit/restart` - Restart Reddit monitor
- `POST /cache/clear` - Clear cache

### Health Check (`/api/v1/health`)
- `GET /` - Basic health check
- `GET /detailed` - Detailed health status
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe

## Installation & Setup

1. **Clone and install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Quick setup (recommended)**:
   ```bash
   # This will set up everything automatically
   npm run dev:setup
   ```

   Or manual setup:

3. **Manual environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (SQLite works out of the box)
   ```

4. **Manual database setup**:
   ```bash
   # Setup database with migrations and seed data
   npm run db:setup

   # Or step by step:
   npx prisma generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 🎯 Quick Start

For the fastest setup experience:

```bash
cd backend
npm install
npm run dev:setup
npm run dev
```

This will automatically:
- Create SQLite database
- Run migrations
- Seed with sample data
- Start the development server

Access the API at: http://localhost:3000/api/v1

Default test accounts:
- Admin: admin@sora2code.com / admin123456
- User: user@sora2code.com / user123456

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Reddit
REDDIT_SUBREDDIT=Borderlands
REDDIT_CHECK_INTERVAL=30

# Features
ENABLE_REDDIT_MONITORING=true
ENABLE_REGISTRATION=true
```

## Reddit Integration

The Reddit service automatically monitors r/Borderlands for new shift codes:

- **Pattern Recognition**: Detects Borderlands shift code format (5-5-5-5-5)
- **Platform Detection**: Automatically identifies PC/Xbox/PlayStation codes
- **Duplicate Prevention**: Avoids importing existing codes
- **Auto Notification**: Sends emails to subscribed users
- **Monitoring Interval**: Configurable check frequency (default: 30 seconds)

## Rate Limiting

Multiple rate limiting tiers:
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **Intensive Operations**: 10 requests per minute
- **Code Copying**: 50 copies per minute

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT tokens with refresh mechanism
- Token blacklisting for logout
- CORS configuration
- Request size limits
- Security headers with Helmet
- Input validation with Zod

## Caching Strategy

Multi-layer caching:
- **Database queries**: Frequently accessed data
- **API responses**: Paginated results and statistics
- **User sessions**: Profile data and preferences
- **Rate limiting**: Request counters per user/IP

## Monitoring & Logging

- **Winston logging** with daily file rotation
- **Health check endpoints** for container orchestration
- **Error tracking** with detailed stack traces
- **Performance monitoring** with request timing
- **Database connection pooling** and health checks

## Development Commands

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:reset     # Reset database
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio

# Testing
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Linting
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix issues
npm run type-check   # TypeScript check
```

## Production Deployment

1. **Environment setup**:
   - Set `NODE_ENV=production`
   - Configure production database
   - Set up Redis instance
   - Configure SMTP settings

2. **Database migration**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

4. **Health checks**:
   - Monitor `/health` endpoint
   - Set up alerts for service availability
   - Monitor Reddit integration status

## Contributing

1. Follow the existing code structure
2. Add proper TypeScript types
3. Include validation schemas
4. Write comprehensive error handling
5. Add logging for important operations
6. Update documentation for new features

## License

This project is part of the sora2 code platform.