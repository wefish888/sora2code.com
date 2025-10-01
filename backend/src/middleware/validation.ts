import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './errorHandler';

// 验证请求体的中间件工厂
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        throw new ValidationError('Request body validation failed', {
          errors: errorMessages,
          receivedData: req.body
        });
      }
      next(error);
    }
  };
};

// 验证查询参数的中间件工厂
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        throw new ValidationError('Query parameters validation failed', {
          errors: errorMessages,
          receivedData: req.query
        });
      }
      next(error);
    }
  };
};

// 验证路径参数的中间件工厂
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        throw new ValidationError('Path parameters validation failed', {
          errors: errorMessages,
          receivedData: req.params
        });
      }
      next(error);
    }
  };
};

// 验证文件上传的中间件
export const validateFile = (options: {
  required?: boolean;
  maxSize?: number; // bytes
  allowedTypes?: string[];
  fieldName?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { required = false, maxSize = 5 * 1024 * 1024, allowedTypes = [], fieldName = 'file' } = options;

    const file = (req as any).files?.[fieldName] || (req as any).file;

    if (required && !file) {
      throw new ValidationError(`File ${fieldName} is required`);
    }

    if (file) {
      // 检查文件大小
      if (file.size > maxSize) {
        throw new ValidationError(`File size exceeds limit of ${maxSize} bytes`);
      }

      // 检查文件类型
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        throw new ValidationError(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
    }

    next();
  };
};