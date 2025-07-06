import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // service层主要处理具体的业务
  getHello(): string {
    return 'Hello Its Ny9u Nest Project';
  }
}
