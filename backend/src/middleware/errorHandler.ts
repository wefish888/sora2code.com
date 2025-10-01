import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 常用错误类
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

// 错误处理中间件
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // 处理自定义错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  }

  // 处理 Prisma 错误
  else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Resource already exists';
        details = { field: prismaError.meta?.target };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      default:
        statusCode = 400;
        message = 'Database operation failed';
    }
  }

  // 处理 JWT 错误
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // 处理验证错误
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = error.message;
  }

  // 处理语法错误
  else if (error instanceof SyntaxError) {
    statusCode = 400;
    message = 'Invalid JSON syntax';
  }

  // 记录错误日志
  const errorLog = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  };

  if (statusCode >= 500) {
    logger.error('Server Error:', errorLog);
  } else {
    logger.warn('Client Error:', errorLog);
  }

  // 返回错误响应
  const errorResponse = {
    success: false,
    error: {
      code: error.name || 'UnknownError',
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      traceId: generateTraceId(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    }
  };

  res.status(statusCode).json(errorResponse);
};

// 生成追踪ID
function generateTraceId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// 异步错误处理包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};