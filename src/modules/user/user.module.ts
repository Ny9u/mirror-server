import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from '@nestjs/jwt';
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { JwtStrategy } from "../../config/jwt.strategy";
import { PrismaModule } from '../prisma/prisma.module';
import { jwtConfig } from '../../config/jwt.config';
import { AvatarModule } from '../avatar/avatar.module';
import { AuthModule } from "../auth/auth.module";
import { EncryptionModule } from "../encryption/encryption.module";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register(jwtConfig),
    AvatarModule,
    forwardRef(() => AuthModule),
    EncryptionModule,
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  exports: [UserService, JwtModule, JwtStrategy],
})
export class UserModule {}