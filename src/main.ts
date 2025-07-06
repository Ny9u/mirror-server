import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';

async function bootstrap() {
  // 创建Nest应用(根模块)
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // 启用CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
  });
  await app.listen(process.env.PORT ?? 3000);
}
config();
bootstrap();
