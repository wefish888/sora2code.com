import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NotFound',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    }
  });
};