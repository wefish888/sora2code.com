# Sora2Code Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Configuration

#### Backend Environment Variables
- [ ] Update `.env` file with production values:
  ```env
  NODE_ENV=production
  DATABASE_URL=file:./production.db
  REDIS_HOST=<your-redis-host>
  JWT_SECRET=<strong-secret>
  ALLOWED_ORIGINS=https://sora2code.com,https://www.sora2code.com
  REDDIT_SUBREDDIT=OpenAI
  TWITTER_SEARCH_QUERY=sora2 invite code OR openai sora OR Sora2 Access
  FRONTEND_URL=https://sora2code.com
  ```

#### Frontend Environment Variables
- [ ] Update `.env` or build config:
  ```env
  PUBLIC_API_BASE_URL=https://api.sora2code.com
  ```

### 2. Database Preparation
- [ ] Run database migrations: `npm run db:migrate`
- [ ] Clear old BL4 data from database (if migrating existing DB)
- [ ] Seed with initial Sora invite codes: `npm run db:seed`
- [ ] Verify database schema is correct

### 3. Code Verification
- [ ] Run TypeScript type checking: `npm run typecheck` (both frontend & backend)
- [ ] Run linting: `npm run lint` (both frontend & backend)
- [ ] Build backend: `cd backend && npm run build`
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Test builds locally

### 4. Domain & DNS Configuration
- [ ] Configure DNS for `sora2code.com` → Frontend server/Cloudflare Pages
- [ ] Configure DNS for `api.sora2code.com` → Backend server/Cloudflare Workers
- [ ] Set up SSL certificates (or use Cloudflare SSL)
- [ ] Verify DNS propagation

### 5. CORS & Security
- [ ] Update `ALLOWED_ORIGINS` in backend to include production domains
- [ ] Verify Cloudflare Workers CORS settings (if using Workers)
- [ ] Test API requests from frontend to backend with production URLs

## Deployment Steps

### Option A: Traditional Server Deployment

#### Backend Deployment
1. [ ] SSH into your server
2. [ ] Pull latest code: `git pull origin main`
3. [ ] Install dependencies: `cd backend && npm ci --production`
4. [ ] Run migrations: `npm run db:migrate`
5. [ ] Build: `npm run build`
6. [ ] Restart backend service: `pm2 restart sora2code-api` or equivalent
7. [ ] Check logs: `pm2 logs sora2code-api`
8. [ ] Test API health: `curl https://api.sora2code.com/health`

#### Frontend Deployment
1. [ ] Build frontend locally: `cd frontend && npm run build`
2. [ ] Upload `dist/` folder to server or CDN
3. [ ] Configure nginx/Apache to serve static files
4. [ ] Test frontend: Visit `https://sora2code.com`

### Option B: Cloudflare Deployment

#### Backend (Cloudflare Workers)
1. [ ] Configure `wrangler.toml` with production settings
2. [ ] Set Workers secrets:
   ```bash
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put REDDIT_CLIENT_ID
   npx wrangler secret put REDDIT_CLIENT_SECRET
   npx wrangler secret put TWITTER_API_KEY
   # ... other secrets
   ```
3. [ ] Create D1 database: `npm run d1:create`
4. [ ] Run D1 migrations: `npm run d1:migrate`
5. [ ] Deploy Workers: `npm run workers:deploy`
6. [ ] Test Workers endpoint: `curl https://api.sora2code.com/health`
7. [ ] Verify cron jobs are configured (check Cloudflare dashboard)

#### Frontend (Cloudflare Pages)
1. [ ] Build frontend: `cd frontend && npm run build`
2. [ ] Deploy to Pages: `npm run deploy` or use Cloudflare dashboard
3. [ ] Configure custom domain in Cloudflare Pages settings
4. [ ] Test frontend: Visit `https://sora2code.com`

## Post-Deployment Verification

### Functional Tests
- [ ] Homepage loads correctly
- [ ] Code list displays properly
- [ ] Copy button works
- [ ] Search/filter functionality works
- [ ] About page displays correct Sora information
- [ ] Guide page has Sora-specific instructions
- [ ] FAQ page reflects Sora content
- [ ] No "BL4" or "Borderlands" references anywhere

### API Tests
- [ ] GET `/api/v1/codes` returns Sora invite codes
- [ ] Codes have proper 6-character format
- [ ] Platform field shows "All" for codes
- [ ] Encryption/decryption works correctly
- [ ] CORS headers allow frontend origin
- [ ] Rate limiting is active

### Monitoring Tests
- [ ] Reddit monitoring is active (check logs)
- [ ] Twitter monitoring is active (if configured)
- [ ] New codes are being collected
- [ ] Codes match Sora invite pattern (6 characters)
- [ ] `isLikelyInviteCode()` filter is working

### Analytics & Tracking
- [ ] Microsoft Clarity is recording sessions
- [ ] Google Analytics is tracking pageviews
- [ ] No console errors in browser
- [ ] API logs show normal traffic

## Rollback Plan

### If Issues Occur
1. [ ] Document the issue
2. [ ] Check error logs: `pm2 logs` or Cloudflare Workers logs
3. [ ] Rollback frontend: Restore previous build
4. [ ] Rollback backend: `git checkout <previous-commit> && npm run build && pm2 restart`
5. [ ] Rollback database: `npm run db:migrate -- --to <previous-migration>`
6. [ ] Notify users if downtime exceeded 5 minutes

## Maintenance Tasks

### Weekly
- [ ] Check for expired codes and mark them
- [ ] Review user reports
- [ ] Monitor API error rates
- [ ] Check database size and performance

### Monthly
- [ ] Review and rotate JWT secrets if needed
- [ ] Update dependencies: `npm outdated` → `npm update`
- [ ] Backup database
- [ ] Review analytics and user feedback

## Success Criteria

- [x] Frontend displays "Sora2Code" branding
- [x] Backend collects codes from r/OpenAI
- [x] Code pattern is 6 characters (not 25)
- [x] Platform is set to "All" (not PC/PS/Xbox)
- [x] Reward descriptions mention "Sora2 Access" (not "Golden Keys")
- [x] All BL4/Borderlands references removed
- [x] Domain resolves to correct IP
- [x] SSL certificate is valid
- [x] API responds within 500ms
- [x] No console errors on frontend
- [x] Reddit/Twitter monitoring collecting codes

## Contact Information

**Support Email**: support@sora2code.com
**Technical Issues**: [Your contact]
**Infrastructure**: [Your infrastructure provider]

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: 1.0.0 (Sora2Code)
