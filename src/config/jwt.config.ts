import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  signOptions: { expiresIn: '12h' },
};

export const refreshJwtConfig: JwtModuleOptions = {
  secret: process.env.REFRESH_JWT_SECRET || 'your-refresh-secret-key',
  signOptions: { expiresIn: '3d' },
};