import { Request, Response } from "express";
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 优先从请求对象中获取请求ID，其次从请求头中获取
    const requestId =
      (request as Request & { requestId: string }).requestId ||
      (request.headers["x-request-id"] as string) ||
      "";
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    const errorDetails =
      typeof errorMessage === "object" && errorMessage !== null
        ? { ...errorMessage }
        : { message: errorMessage };

    const errorResponse = {
      timestamp: new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
      }),
      code: status,
      path: request.url,
      method: request.method,
      message: errorDetails.message || "Unknown error",
    };

    // 根据错误级别记录日志
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${requestId} - ${request.url} - ${JSON.stringify(errorDetails, null, 2)}`,
        exception instanceof Error ? exception.stack : undefined
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `${requestId} - ${request.url} - ${JSON.stringify(errorDetails, null, 2)}`
      );
    } else {
      this.logger.log(
        `${requestId} - ${request.url} - ${JSON.stringify(errorDetails, null, 2)}`
      );
    }

    response.status(status).json(errorResponse);
  }
}
