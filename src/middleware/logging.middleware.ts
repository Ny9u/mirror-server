import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly lowestLogLevel: LogLevel = LogLevel.INFO;

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    
    // 处理请求完成事件
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      
      // 构建简化的日志数据
      const logData = {
        time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        method,
        url: originalUrl,
        ip,
        userAgent,
        statusCode,
        duration: `${duration}ms`
      };
      
      if (statusCode >= 500) {
        this.log(LogLevel.ERROR, logData);
      } else if (statusCode >= 400) {
        this.log(LogLevel.WARN, logData);
      } else {
        this.log(LogLevel.INFO, logData);
      }
    });

    try {
      next();
    } catch (error) {
      const duration = Date.now() - start;
      const errorLogData = {
        time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        method,
        url: originalUrl,
        ip,
        userAgent,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        duration: `${duration}ms`
      };
      
      this.log(LogLevel.ERROR, errorLogData);
      throw error;
    }
  }
  
  /**
   * 统一的日志输出方法，根据日志级别决定是否输出日志
   * @param level 日志级别
   * @param data 日志数据
   */
  private log(level: LogLevel, data: any): void {
    const levels = [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    if (levels.indexOf(level) >= levels.indexOf(this.lowestLogLevel)) {
      const colorCodes = {
        [LogLevel.INFO]: '\x1b[32m',
        [LogLevel.WARN]: '\x1b[33m',
        [LogLevel.ERROR]: '\x1b[31m'
      };
      const consoleMethods = {
        [LogLevel.INFO]: console.log,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error
      };
      const logMessage = `${colorCodes[level]}[${level.toUpperCase()}]\x1b[0m ${JSON.stringify(data)}`;
      consoleMethods[level](logMessage);
    }
  }
}