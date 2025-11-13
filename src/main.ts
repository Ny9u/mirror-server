/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/error.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

config();
async function bootstrap() {
  // 创建Nest应用(根模块)
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 配置静态文件服务
  app.use('/uploads', (req, res, next) => {
    const requestedPath = req.path;
    if (requestedPath.includes('../') || requestedPath.includes('..\\')) {
      return res.status(403).send('Forbidden');
    }
    next();
  });
  
  app.use('/cache/thumbnails', (req, res, next) => {
    const requestedPath = req.path;
    if (requestedPath.includes('../') || requestedPath.includes('..\\')) {
      return res.status(403).send('Forbidden');
    }
    next();
  });
  
  // 提供静态文件服务
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  
  app.useStaticAssets(join(__dirname, '..', 'cache'), {
    prefix: '/cache',
  });
  
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.setGlobalPrefix('api/v1');
  // 启用CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
