/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  code: number;
  data: T;
  message?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        const response = context.switchToHttp().getResponse();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const statusCode = response.statusCode || 200;
        
        return {
          code: statusCode,
          data: data,
          message: 'success',
        };
      }),
    );
  }
}