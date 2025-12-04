import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { AvatarModule } from './modules/avatar/avatar.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { EmailModule } from './modules/email/email.module';
import { TTSModule } from './modules/tts/tts.module';
import { AsrModule } from './modules/asr/asr.module';
import { FavoriteModule } from './modules/favorite/favorite.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, 
    AvatarModule, 
    UserModule,
    AuthModule,
    EncryptionModule,
    EmailModule,
    TTSModule,
    AsrModule,
    FavoriteModule,
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


