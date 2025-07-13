import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Observable } from "rxjs";
import { catchError, map } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

@Injectable()
export class FetchService {
  constructor(private readonly httpService: HttpService) {}
  
  getUserInfo(params: {userId: number}): Observable<any> {
    const requests = [
      this.httpService.get('/avatar', { params: { userId: params?.userId } }),
      this.httpService.get('/name', { params: { userId: params?.userId } })
    ].map(request => 
      request.pipe(
        map(response => ({
          code: 200,
          message: "Success",
          data: response.data
        })),
        catchError(error => of({
          code: error.response?.status || 500,
          message: error.message
        }))
      )
    );
    return forkJoin(requests).pipe(
      map(results => ({
        code: 200,
        message: 'request completed',
        results: results
      }))
    );
  }
}