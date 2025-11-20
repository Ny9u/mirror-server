/* eslint-disable @typescript-eslint/no-misused-promises */
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
import { readdirSync, unlinkSync } from 'fs';

config();
function clearCacheDirectory() {
  const cacheRootDir = join(__dirname, '..', 'cache');
  
  try {
    function clearDirectoryRecursively(dirPath: string) {
      const items = readdirSync(dirPath, { withFileTypes: true });
      
      items.forEach(item => {
        const fullPath = join(dirPath, item.name);
        
        if (item.isDirectory()) {
          clearDirectoryRecursively(fullPath);
        } else {
          unlinkSync(fullPath);
        }
      });
    }
    
    clearDirectoryRecursively(cacheRootDir);
    console.log('缓存目录已清空');
  } catch (error) {
    console.error('清空缓存目录失败:', error);
  }
}

async function bootstrap() {
  // 创建Nest应用(根模块)
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 配置raw body中间件，用于处理加密数据的用户相关接口
  const routesNeedingRawBody = new Set(['/register', '/login', '/updatePassword']);
  app.use('/api/v1/user', (req, res, next) => {
    if (routesNeedingRawBody.has(req.path) && req.headers['content-type'] === 'text/plain') {
      req.setEncoding('utf8');
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        req.rawBody = data;
        next();
      });
    } else {
      next();
    }
  });
  
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
  
  process.on('SIGINT', async () => {
    clearCacheDirectory();
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    clearCacheDirectory();
    await app.close();
    process.exit(0);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
