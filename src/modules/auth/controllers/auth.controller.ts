import {
  Controller,
  Post,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Req,
  Res,
} from "@nestjs/common";
import { Request as ExpressRequest, Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import { UserDto } from "../../user/user.dto";
import { AvatarService } from "../../avatar/avatar.service";
import { SessionService } from "../services/session.service";

type User = UserDto;

interface AuthRequest extends ExpressRequest {
  user: User;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly avatarService: AvatarService,
    private readonly sessionService: SessionService
  ) {}

  // 验证JWT令牌并返回用户信息
  @UseGuards(AuthGuard("jwt"))
  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validateToken(@Req() req: AuthRequest): Promise<UserDto> {
    const user = req.user;
    const userAvatar = await this.avatarService.getAvatar(user.id);
    const avatarUrl = userAvatar ? userAvatar.avatarUrl : null;

    return {
      ...user,
      avatar: avatarUrl,
    };
  }

  // 登出接口
  @UseGuards(AuthGuard("jwt"))
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ message: string }> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refresh_token;

    // 删除用户的会话
    if (refreshToken) {
      await this.sessionService.deleteSession(refreshToken);
    } else {
      // 如果没有 refresh token，删除该用户的所有会话
      await this.sessionService.deleteAllUserSessions(req.user.id);
    }

    // 清除 Cookie
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return { message: "登出成功" };
  }
}
