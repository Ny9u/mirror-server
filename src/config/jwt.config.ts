import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  signOptions: { expiresIn: '1m' },
};

export const refreshJwtConfig: JwtModuleOptions = {
  secret: process.env.REFRESH_JWT_SECRET || 'your-refresh-secret-key',
  signOptions: { expiresIn: '7d' },
};