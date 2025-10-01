import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../worker';

const adminRoutes = new Hono<{ Bindings: Env }>();

// Admin routes - simplified for Workers
adminRoutes.get('/dashboard', async (c) => {
  return c.json({
    success: true,
    message: 'Admin dashboard endpoint (admin authentication required)'
  });
});

adminRoutes.get('/reports', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT
        cr.*,
        sc.code,
        sc.rewardDescription
      FROM code_reports cr
      JOIN shift_codes sc ON cr.codeId = sc.id
      WHERE cr.status = 'pending'
      ORDER BY cr.createdAt DESC
      LIMIT 50
    `).all();

    return c.json({
      success: true,
      data: result.results || []
    });

  } catch (error) {
    console.error('Error getting reports:', error);
    throw new HTTPException(500, { message: 'Failed to fetch reports' });
  }
});

export { adminRoutes };