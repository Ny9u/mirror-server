import { Module, forwardRef } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { RefreshTokenService } from "./services/refresh-token.service";
import { SessionService } from "./services/session.service";
import { RefreshTokenController } from "./controllers/refresh-token.controller";
import { AuthController } from "./controllers/auth.controller";
import { jwtConfig, refreshJwtConfig } from "../../config/jwt.config";
import { UserModule } from "../user/user.module";
import { AvatarModule } from "../avatar/avatar.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    JwtModule.register(jwtConfig),
    forwardRef(() => UserModule),
    AvatarModule,
    PrismaModule,
  ],
  controllers: [RefreshTokenController, AuthController],
  providers: [
    RefreshTokenService,
    SessionService,
    {
      provide: "REFRESH_JWT_SERVICE",
      useFactory: () => {
        return new JwtService(refreshJwtConfig);
      },
    },
  ],
  exports: [RefreshTokenService, SessionService],
})
export class AuthModule {}
