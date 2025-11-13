import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { AvatarModule } from './modules/avatar/avatar.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { NameModule } from './modules/name/name.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    PrismaModule, 
    AvatarModule, 
    NameModule,
    UserModule,
    AuthModule,
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
