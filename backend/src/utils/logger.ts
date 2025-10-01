import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// 处理循环引用的替换函数
function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

const logLevel = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      try {
        log += ` ${JSON.stringify(meta)}`;
      } catch (err) {
        log += ` ${JSON.stringify(meta, getCircularReplacer())}`;
      }
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// 创建 Winston logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'sora2code-api' },
  transports: []
});

// 开发环境配置
if (NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  }));
}

// 生产环境配置
if (NODE_ENV === 'production') {
  // 错误日志文件
  logger.add(new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  }));

  // 组合日志文件
  logger.add(new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    zippedArchive: true
  }));

  // 控制台输出（生产环境简化格式）
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.json()
    )
  }));
}

// 创建日志目录
import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export { logger };

// 导出不同级别的日志函数
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  verbose: (message: string, meta?: any) => logger.verbose(message, meta)
};