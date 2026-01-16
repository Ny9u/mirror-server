import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { jwtConfig } from "./jwt.config";
import { UserService } from "../modules/user/user.service";
import { UserDto } from "../modules/user/user.dto";

// JWT载荷接口
export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 尝试从 Cookie 中提取
        (request: Request) => {
          const token = (
            request?.cookies as { access_token?: string } | undefined
          )?.access_token;
          return token ?? null;
        },
        // 如果 Cookie 中没有，再尝试从 Authorization header 提取（向后兼容）
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: (jwtConfig.secret as string) || "your-secret-key",
    });
  }

  // 验证JWT载荷并返回用户信息
  async validate(payload: JwtPayload): Promise<UserDto> {
    // 根据载荷中的用户ID查找用户
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    return user;
  }
}
