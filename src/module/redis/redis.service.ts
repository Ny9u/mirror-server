import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redisClient: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: 'localhost', 
      port: 6379, 
    });
  }

  // 使用正确的参数格式实现setValue方法
  async setValue(key: string, value: string, expireMode?: any, expireTime?: number): Promise<string> {
    if (expireMode && expireTime) {
      return await this.redisClient.set(key, value, expireMode, expireTime);
    }
    return await this.redisClient.set(key, value);
  }

  async getValue(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }
}

