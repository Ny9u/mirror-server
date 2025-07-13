import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { AvatarModule } from './module/avatar/avatar.module';
import { PrismaModule } from './module/prisma/prisma.module'
import { FetchModule } from './module/fetch/fetch.module';
import { NameModule } from './module/name/name.module';

@Module({
  imports: [
    PrismaModule, 
    AvatarModule, 
    FetchModule,
    NameModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*');
  }
}
