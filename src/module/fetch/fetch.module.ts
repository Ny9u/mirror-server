import { Module } from "@nestjs/common";
import { FetchService } from "./fetch.service";
import { FetchController } from "./fetch.controller";
import { HttpModule } from "@nestjs/axios";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'http://localhost:3000/api/v1',
      timeout: 10000,
    }),
    RedisModule
  ],
  controllers: [FetchController],
  providers: [FetchService],
})
export class FetchModule {}
