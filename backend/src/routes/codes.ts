import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../worker';
import { encryptionMiddleware } from '../middleware/encryption';

const codesRoutes = new Hono<{ Bindings: Env }>();

// 应用强制加密中间件到所有路由
codesRoutes.use('*', encryptionMiddleware);

// Query schema for validation
const codesQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  platform: z.enum(['pc', 'playstation', 'xbox', 'all']).optional(),
  status: z.enum(['active', 'expired', 'pending', 'all']).optional().default('active'),
  search: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'popular']).optional().default('newest')
});

const reportCodeSchema = z.object({
  reason: z.enum(['expired', 'invalid', 'duplicate', 'inappropriate', 'spam', 'other']),
  description: z.string().optional(),
  contactEmail: z.string().email().optional()
});

// Get codes list
codesRoutes.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get codes
    const codesQuery = `
      SELECT *
      FROM shift_codes
      WHERE status != 'deleted'
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const codesResult = await c.env.DB.prepare(codesQuery).bind(limit, offset).all();
    const codes = codesResult.results || [];

    // Get platforms for each code
    const codesWithPlatforms = await Promise.all(
      codes.map(async (code: any) => {
        const platformsResult = await c.env.DB.prepare(
          'SELECT platform FROM code_platforms WHERE codeId = ?'
        ).bind(code.id).all();

        return {
          ...code,
          platforms: (platformsResult.results || []).map((p: any) => ({ platform: p.platform })),
          _count: {
            favorites: 0,
            reports: 0,
            copyEvents: 0
          },
          expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString() : null,
          createdAt: new Date(code.createdAt).toISOString(),
          updatedAt: new Date(code.updatedAt).toISOString()
        };
      })
    );

    // Get total count
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM shift_codes WHERE status != 'deleted'"
    ).first();
    const total = (countResult as any)?.total || 0;

    return c.json({
      success: true,
      data: {
        codes: codesWithPlatforms,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      },
      count: codesWithPlatforms.length
    });

  } catch (error) {
    console.error('Error getting codes:', error);
    throw new HTTPException(500, { message: 'Failed to fetch codes' });
  }
});

// Get stats
codesRoutes.get('/stats', async (c) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as totalCodes,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeCodes,
        SUM(copyCount) as totalCopies,
        COUNT(CASE WHEN createdAt > datetime('now', '-24 hours') THEN 1 END) as newToday
      FROM shift_codes
    `;

    const result = await c.env.DB.prepare(statsQuery).first();

    return c.json({
      success: true,
      data: result || {
        totalCodes: 0,
        activeCodes: 0,
        totalCopies: 0,
        newToday: 0
      }
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    throw new HTTPException(500, { message: 'Failed to fetch stats' });
  }
});

// Get single code
codesRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT
        sc.*,
        GROUP_CONCAT(cp.platform) as platforms
      FROM shift_codes sc
      LEFT JOIN code_platforms cp ON sc.id = cp.codeId
      WHERE sc.id = ?
      GROUP BY sc.id
    `).bind(id).first();

    if (!result) {
      throw new HTTPException(404, { message: 'Code not found' });
    }

    const code = {
      ...result,
      platforms: (result as any).platforms ? (result as any).platforms.split(',') : [],
      expiresAt: (result as any).expiresAt ? new Date((result as any).expiresAt).toISOString() : null,
      createdAt: new Date((result as any).createdAt).toISOString(),
      updatedAt: new Date((result as any).updatedAt).toISOString()
    };

    return c.json({
      success: true,
      data: code
    });

  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error getting code:', error);
    throw new HTTPException(500, { message: 'Failed to fetch code' });
  }
});

// Copy code (increment counter)
codesRoutes.post('/:id/copy', async (c) => {
  try {
    const id = c.req.param('id');

    // Check if code exists
    const code = await c.env.DB.prepare('SELECT id, status FROM shift_codes WHERE id = ?').bind(id).first();

    if (!code) {
      throw new HTTPException(404, { message: 'Code not found' });
    }

    // Increment copy count
    await c.env.DB.prepare('UPDATE shift_codes SET copyCount = copyCount + 1 WHERE id = ?').bind(id).run();

    // Log copy event
    await c.env.DB.prepare(`
      INSERT INTO code_events (id, codeId, eventType, createdAt)
      VALUES (?, ?, 'copy', datetime('now'))
    `).bind(crypto.randomUUID(), id).run();

    return c.json({
      success: true,
      message: 'Code copied successfully'
    });

  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error copying code:', error);
    throw new HTTPException(500, { message: 'Failed to copy code' });
  }
});

// Report code
codesRoutes.post('/:id/report', zValidator('json', reportCodeSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const { reason, description, contactEmail } = c.req.valid('json');

    // Check if code exists
    const code = await c.env.DB.prepare('SELECT id FROM shift_codes WHERE id = ?').bind(id).first();

    if (!code) {
      throw new HTTPException(404, { message: 'Code not found' });
    }

    // Create report
    await c.env.DB.prepare(`
      INSERT INTO code_reports (id, codeId, reportedBy, reason, description, contactEmail, status, createdAt)
      VALUES (?, ?, 'anonymous', ?, ?, ?, 'pending', datetime('now'))
    `).bind(crypto.randomUUID(), id, reason, description || null, contactEmail || null).run();

    return c.json({
      success: true,
      message: 'Report submitted successfully'
    });

  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error reporting code:', error);
    throw new HTTPException(500, { message: 'Failed to submit report' });
  }
});

export { codesRoutes };