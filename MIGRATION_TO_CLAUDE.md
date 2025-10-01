# Migration to Claude AI - Summary

## Overview

Successfully migrated from Reddit/Twitter API data sources to Claude AI for automated Sora invite code collection.

## Changes Made

### 1. New Claude Service (`backend/src/services/claude.service.ts`)
- Created new `ClaudeService` class for code collection
- Uses Claude 3.5 Sonnet model via Anthropic API
- Intelligent web search across multiple sources (Reddit, Twitter/X, forums, blogs)
- Automated code validation and extraction
- Configurable monitoring interval (default: 10 minutes)

### 2. Removed Services
- ❌ Deleted `backend/src/services/reddit.service.ts`
- ❌ Deleted `backend/src/services/twitter.service.ts`
- ❌ Deleted test files: `test-reddit.ts`, `test-real-reddit.ts`, `real-reddit-monitor.ts`, `mock-reddit-monitor.ts`

### 3. Updated Files

#### `backend/src/index.ts`
- Replaced `TwitterService` import with `ClaudeService`
- Changed `ENABLE_TWITTER_MONITORING` to `ENABLE_CLAUDE_MONITORING`

#### `backend/src/worker.ts` (Cloudflare Workers)
- Updated `Env` interface: removed Reddit/Twitter keys, added `ANTHROPIC_API_KEY`
- Replaced `fetchRedditPosts()` and `extractCodesFromPost()` with `searchAndExtractCodesWithClaude()`
- Simplified code extraction using Claude's intelligent search

#### `backend/src/services/codes.service.ts`
- Removed Reddit-priority sorting logic
- All codes now sorted equally by specified field (createdAt, copyCount, etc.)

#### `backend/.env.example`
- Removed: `REDDIT_*` and `TWITTER_*` environment variables
- Added: `ANTHROPIC_API_KEY` and `CLAUDE_CHECK_INTERVAL`
- Changed: `ENABLE_REDDIT_MONITORING` → `ENABLE_CLAUDE_MONITORING`

#### `backend/package.json`
- Added dependency: `@anthropic-ai/sdk: ^0.20.0`

#### `CLAUDE.md`
- Updated Code Collection System section
- Updated Environment Configuration section
- Removed Reddit-priority sorting mention

## Environment Setup

### Required Environment Variables

```bash
# Claude AI Integration
ANTHROPIC_API_KEY=sk-ant-api03-xxx  # Get from https://console.anthropic.com
CLAUDE_CHECK_INTERVAL=600           # Check every 10 minutes (in seconds)
ENABLE_CLAUDE_MONITORING=true       # Enable/disable monitoring
```

### Installation

```bash
cd backend
npm install  # Install new @anthropic-ai/sdk dependency
```

## How It Works

1. **Scheduled Monitoring**: Claude service runs at configured intervals (default: 10 minutes)
2. **Intelligent Search**: Claude searches across multiple platforms for Sora invite codes
3. **Validation**: Codes are validated (6 chars, alphanumeric, mix of letters/numbers)
4. **Deduplication**: Checks database to avoid saving duplicate codes
5. **Storage**: Valid new codes saved to database with source attribution
6. **Notification**: Subscribers notified of new codes via email

## Advantages Over Previous Approach

### Before (Reddit/Twitter APIs)
- ❌ Required separate API credentials for Reddit and Twitter
- ❌ Rate limits and API restrictions
- ❌ Limited to specific platforms
- ❌ Manual post/tweet parsing with regex
- ❌ Complex authentication (OAuth, Bearer tokens)

### After (Claude AI)
- ✅ Single API key (Anthropic)
- ✅ Searches across multiple sources simultaneously
- ✅ Intelligent context understanding
- ✅ Better false-positive filtering
- ✅ Simpler implementation
- ✅ More reliable and maintainable

## API Usage

### Manual Code Search (API Endpoint)

You can trigger a manual search via the admin API:

```bash
POST /api/v1/admin/codes/search
Authorization: Bearer <admin-token>
```

This calls `ClaudeService.manualSearch()` to immediately search for new codes.

## Monitoring

### Check Service Status

```typescript
import { ClaudeService } from './services/claude.service';

const status = ClaudeService.getMonitorStatus();
console.log(status);
// {
//   isRunning: true,
//   lastCheck: Date,
//   totalChecks: 42,
//   codesFound: 15,
//   errors: 0
// }
```

### View Logs

```typescript
const logs = await ClaudeService.getLogs({
  page: 1,
  limit: 50,
  level: 'info' // or 'error'
});
```

## Cost Considerations

- Claude API pricing: ~$3 per million input tokens, ~$15 per million output tokens
- Estimated usage: ~2,000 tokens per search = ~$0.01 per search
- At 10-minute intervals: ~144 searches/day = ~$1.44/day = ~$43/month
- Significantly cheaper than maintaining dedicated Reddit/Twitter API infrastructure

## Rollback Plan

If you need to rollback:

1. Restore deleted service files from git history
2. Revert changes to `index.ts`, `worker.ts`, `codes.service.ts`
3. Restore Reddit/Twitter environment variables
4. Run `npm install` to ensure axios is available
5. Set `ENABLE_REDDIT_MONITORING=true` or `ENABLE_TWITTER_MONITORING=true`

## Next Steps

1. ✅ Set `ANTHROPIC_API_KEY` in `.env`
2. ✅ Run `npm install` in backend directory
3. ✅ Set `ENABLE_CLAUDE_MONITORING=true`
4. ✅ Start the server: `npm run dev`
5. ✅ Monitor logs for successful code collection
6. ✅ (Optional) Update Cloudflare Workers environment with `ANTHROPIC_API_KEY`

## Support

For issues or questions:
- Check logs in `backend/logs/`
- Review `ClaudeService.getMonitorStatus()` for service health
- Ensure `ANTHROPIC_API_KEY` is valid and has sufficient credits
- Check Anthropic API status: https://status.anthropic.com

---

Migration completed: 2025-10-01
