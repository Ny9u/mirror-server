import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const logMessage = `${method} ${originalUrl} - ${statusCode} [${duration}ms]`;
      
      console.log(`[${new Date().toISOString()}] Request:`, logMessage);
    });

    next();
  }
}