import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Observable, from, of } from "rxjs";
import { catchError, map, switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { RedisService } from "../redis/redis.service";

@Injectable()
export class FetchService {
  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService
  ) {}
  
  getUserInfo(params: {userId: number}): Observable<any> {
    const cacheKey = `user-info-${params.userId}`;
    
    return from(this.redisService.getValue(cacheKey)).pipe(
      switchMap(cacheData => {
        if (cacheData) {
          // 缓存命中
          return of({
            code: 200,
            message: 'Data from Redis',
            results: JSON.parse(cacheData),
            fromCache: true
          });
        } else {
          // 缓存未命中，执行原请求逻辑
          const requests = [
            this.httpService.get('/avatar', { params: { userId: params?.userId } }),
            this.httpService.get('/name', { params: { userId: params?.userId } })
          ].map(request => 
            request.pipe(
              map(response => ({
                code: 200,
                message: "Success",
                data: response.data || null
              })),
              catchError(error => of({
                code: error.response?.status || 500,
                message: error.message || 'error'
              }))
            )
          );

          return forkJoin(requests).pipe(
            switchMap(results => {
              // 使用from将异步的setValue调用转换为Observable
              return from(this.redisService.setValue(cacheKey, JSON.stringify(results), 'EX', 30)).pipe(
                map(() => ({
                  code: 200,
                  message: 'request completed',
                  results: results,
                  fromCache: false
                }))
              );
            })
          );
        }
      })
    );
  }
}