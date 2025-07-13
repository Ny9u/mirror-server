import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Observable } from "rxjs";
import { catchError, map } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

@Injectable()
export class FetchService {
  constructor(private readonly httpService: HttpService) {}
  
  getAll(params: {id: number}): Observable<any> {
    // return this.httpService.get('/avatar', { params: { id: params?.id | 1 } })
    //   .pipe(
    //     map(response => ({
    //       code: 200,
    //       message: 'Success',
    //       data: response.data
    //     })),
    //     catchError(error => of({
    //       code: error.response?.status || 500,
    //       message: error.message,
    //       data: null
    //     }))
    //   );
    const requests = Array(20).fill(
      this.httpService.get('/avatar', { params: { id: params?.id | 1 } }).pipe(
        map(response => ({
          status: 'success',
          data: response.data
        })),
        catchError(error => of({
          status: 'error',
          message: error.message
        }))
      )
    )
    return forkJoin(requests).pipe(
      map(results => ({
        code: 200,
        message: 'Batch request completed',
        results: results
      }))
    );
  }
}