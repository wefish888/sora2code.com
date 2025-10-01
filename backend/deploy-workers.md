# Cloudflare Workers Deployment Guide

This guide explains how to deploy the sora2code backend to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally with `npm install -g wrangler`
3. **Domain**: Your domain should be added to Cloudflare (optional for testing)

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate with Cloudflare.

## Step 3: Create D1 Database

```bash
# Create production database
wrangler d1 create sora2code-prod

# Create staging database (optional)
wrangler d1 create sora2code-staging
```

Copy the database IDs from the output and update `wrangler.toml`.

## Step 4: Update wrangler.toml

Edit `wrangler.toml` and replace the placeholder database IDs:

```toml
[env.production.d1_databases]
binding = "DB"
database_name = "sora2code-prod"
database_id = "your-actual-database-id-here"
```

## Step 5: Create KV Namespace (for caching)

```bash
# Create production KV
wrangler kv:namespace create "CACHE"

# Create preview KV
wrangler kv:namespace create "CACHE" --preview
```

Update `wrangler.toml` with the KV namespace IDs.

## Step 6: Initialize Database Schema

```bash
# For production
wrangler d1 execute sora2code-prod --file=schema.sql

# For staging
wrangler d1 execute sora2code-staging --file=schema.sql
```

## Step 7: Set Environment Variables

Create secrets for sensitive data:

```bash
# JWT Secret
wrangler secret put JWT_SECRET

# Encryption Key
wrangler secret put ENCRYPTION_KEY

# Allowed Origins
wrangler secret put ALLOWED_ORIGINS

# API Keys (optional)
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
wrangler secret put EMAIL_API_KEY
```

When prompted, enter the actual values for each secret.

## Step 8: Deploy to Workers

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

## Step 9: Set Custom Domain (Optional)

1. Go to Cloudflare Dashboard > Workers & Pages
2. Click on your worker
3. Go to Settings > Triggers
4. Add custom domain: `api.sora2code.com`

## Step 10: Test Deployment

```bash
# Test health endpoint
curl https://your-worker.your-subdomain.workers.dev/health

# Test codes endpoint
curl https://your-worker.your-subdomain.workers.dev/api/v1/codes
```

## Development Workflow

### Local Development
```bash
# Run locally with D1 local database
wrangler dev --local

# Run with remote D1 database
wrangler dev
```

### Database Operations
```bash
# Query database
wrangler d1 execute sora2code-prod --command="SELECT * FROM shift_codes LIMIT 5"

# Import data
wrangler d1 execute sora2code-prod --file=data.sql

# Backup database
wrangler d1 export sora2code-prod --output=backup.sql
```

### Monitoring
```bash
# View real-time logs
wrangler tail

# View deployment logs
wrangler tail --format=pretty
```

## Key Differences from Express

1. **No Server**: Workers are serverless - no `app.listen()`
2. **D1 Database**: SQLite-compatible, but with different connection patterns
3. **KV Storage**: For caching instead of Redis
4. **Hono Framework**: Lightweight alternative to Express
5. **Environment Variables**: Managed through Wrangler secrets

## Environment Configuration

### Production Setup
- Domain: `api.sora2code.com`
- Database: Production D1 instance
- KV: Production namespace
- Secrets: Production API keys

### Staging Setup
- Domain: `staging-api.sora2code.com` (optional)
- Database: Staging D1 instance
- KV: Staging namespace
- Secrets: Test/staging API keys

## Monitoring and Maintenance

1. **Analytics**: View in Cloudflare Dashboard
2. **Error Tracking**: Check Workers logs
3. **Performance**: Monitor response times
4. **Database**: Regular backups with `wrangler d1 export`

## Cost Considerations

- **Workers**: 100,000 requests/day free
- **D1**: 5M row reads + 100K row writes/day free
- **KV**: 100K operations/day free
- **R2**: 10GB storage free

For production usage, consider upgrading to Workers Paid plan.

## Troubleshooting

### Common Issues

1. **Database Connection**: Check D1 database ID in wrangler.toml
2. **CORS Errors**: Update ALLOWED_ORIGINS environment variable
3. **Memory Limits**: Workers have 128MB memory limit
4. **Execution Time**: 30-second maximum execution time

### Useful Commands

```bash
# View worker logs
wrangler tail

# Delete worker
wrangler delete

# View worker info
wrangler whoami

# List D1 databases
wrangler d1 list
```