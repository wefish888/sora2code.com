# sora2code Backend Deployment Guide

## 📋 Overview

This guide covers the deployment of the sora2code backend API to production environments using Docker and Docker Compose.

## 🔧 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- A server with at least 2GB RAM and 10GB storage
- Domain name (sora2code.com) with DNS configured
- SSL certificates for HTTPS

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo-url>
cd sora2code.com/backend

# Make deployment script executable
chmod +x deploy.sh
```

### 2. Configure Environment

```bash
# Copy and edit production environment file
cp .env.production .env.production.local

# Edit with your production values
nano .env.production
```

**Important**: Update these values in `.env.production`:
- `JWT_SECRET` and `JWT_REFRESH_SECRET` - Use strong, random secrets
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, etc. - Your Reddit API credentials
- `SMTP_*` - Your email server configuration
- `ALLOWED_ORIGINS` - Your production domain

### 3. SSL Setup

```bash
# Create SSL directory
mkdir -p ssl

# Copy your SSL certificates
cp /path/to/your/cert.pem ssl/cert.pem
cp /path/to/your/key.pem ssl/key.pem
```

### 4. Deploy

```bash
# Run deployment script
./deploy.sh production
```

## 📁 Directory Structure

```
backend/
├── data/                   # Database files (persistent)
├── logs/                   # Application logs (persistent)
├── ssl/                    # SSL certificates
├── backups/               # Database backups
├── docker-compose.yml     # Docker services configuration
├── Dockerfile            # Application container definition
├── nginx.conf            # Nginx reverse proxy configuration
├── .env.production       # Production environment variables
└── deploy.sh             # Deployment script
```

## 🐳 Docker Services

### sora2code-api
- **Port**: 3000 (internal)
- **Image**: Built from Dockerfile
- **Volumes**: `./data`, `./logs`
- **Health Check**: HTTP GET /health

### redis
- **Port**: 6379 (internal)
- **Image**: redis:7-alpine
- **Volume**: `redis-data`
- **Purpose**: Caching and session storage

### nginx
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Image**: nginx:alpine
- **Purpose**: Reverse proxy, SSL termination, rate limiting

## 🔄 Management Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f sora2code-api
docker-compose logs -f nginx
docker-compose logs -f redis
```

### Service Control
```bash
# Stop all services
docker-compose down

# Start services
docker-compose up -d

# Restart specific service
docker-compose restart sora2code-api

# Rebuild and restart
docker-compose build --no-cache sora2code-api
docker-compose up -d
```

### Database Operations
```bash
# Access database shell
docker-compose exec sora2code-api npx prisma studio

# Run migrations
docker-compose exec sora2code-api npm run db:deploy

# Backup database
docker-compose exec sora2code-api cp /app/data/production.db /app/backups/manual-backup-$(date +%Y%m%d).db
```

### Application Shell
```bash
# Access container shell
docker-compose exec sora2code-api sh

# Run Reddit monitoring manually
docker-compose exec sora2code-api node -e "require('./dist/real-reddit-monitor').runRealRedditMonitoring()"
```

## 🔒 Security Considerations

### SSL/TLS
- Uses TLS 1.2 and 1.3 only
- Strong cipher suites configured
- HSTS enabled with 2-year max-age
- Security headers configured

### Rate Limiting
- API routes: 10 requests/second with burst of 20
- Auth routes: 5 requests/second with burst of 5
- Implemented at Nginx level

### Application Security
- Non-root user in container (sora2code:1001)
- Minimal Alpine Linux base image
- Only necessary ports exposed
- Environment variables for secrets

## 📊 Monitoring

### Health Checks
- **API**: `GET /health` returns 200 with status info
- **Redis**: `redis-cli ping` returns PONG
- **Nginx**: `nginx -t` validates configuration

### Log Files
- **Application**: `./logs/app.log`
- **Nginx Access**: `./logs/nginx/access.log`
- **Nginx Error**: `./logs/nginx/error.log`
- **Deployment**: `./deploy.log`

### Metrics Endpoints
- `GET /health` - Service health and database status
- `GET /api/v1/stats` - Application statistics

## 🔄 Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Deploy with backup
./deploy.sh production
```

### Database Backups
- Automatic backups before each deployment
- Backups stored in `./backups/`
- Automatic cleanup of backups older than 7 days

### Log Rotation
- Configured via Docker logging driver
- Logs rotate at 50MB with 30-day retention

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs sora2code-api

# Check environment
docker-compose config

# Validate Nginx config
docker-compose exec nginx nginx -t
```

### Database Issues
```bash
# Check database connection
docker-compose exec sora2code-api npm run db:generate

# Reset database (CAUTION: Data loss)
docker-compose exec sora2code-api npm run db:reset
```

### SSL Issues
```bash
# Verify certificates
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL
curl -I https://sora2code.com/health
```

### Network Issues
```bash
# Check container connectivity
docker network ls
docker network inspect bl4codes_bl4codes-network
```

## 📈 Performance Optimization

### Resource Limits (add to docker-compose.yml)
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Database Optimization
- Regular VACUUM operations for SQLite
- Monitor database size and performance
- Consider upgrading to PostgreSQL for high load

## 🔐 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | production |
| `PORT` | Application port | No | 3000 |
| `DATABASE_URL` | Database connection | Yes | file:./data/production.db |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `REDDIT_CLIENT_ID` | Reddit API client ID | Yes | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | Yes | - |
| `ENABLE_REDDIT_MONITORING` | Enable Reddit monitoring | No | true |

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: `docker-compose config`
3. Test health endpoint: `curl http://localhost:3000/health`
4. Review this documentation

## 🔄 Rollback Procedure

If deployment fails:
```bash
# Stop current services
docker-compose down

# Restore database backup
cp backups/production-YYYYMMDD-HHMMSS.db data/production.db

# Deploy previous version
git checkout <previous-commit>
./deploy.sh production
```