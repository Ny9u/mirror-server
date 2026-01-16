import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { RefreshTokenService } from "../services/refresh-token.service";
import { UserService } from "../../user/user.service";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RefreshTokenDto } from "../dtos/refresh-token.dto";

@ApiTags("auth")
@Controller("auth")
export class RefreshTokenController {
  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly userService: UserService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  @ApiOperation({ summary: "刷新访问令牌" })
  @ApiResponse({ status: 200, description: "成功刷新访问令牌" })
  @ApiResponse({ status: 401, description: "无效的refresh token" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto?: RefreshTokenDto
  ): Promise<{ message: string }> {
    try {
      // 优先从 Cookie 中读取 refresh token,其次从 body 中读取（向后兼容）
      const cookies = req.cookies as { refresh_token?: string } | undefined;
      const refreshToken =
        cookies?.refresh_token || refreshTokenDto?.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedException("缺少 refresh token");
      }

      const { token, newRefreshToken } =
        await this.refreshTokenService.refreshAccessToken(refreshToken);

      // 设置新的 Cookie
      res.cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 12 * 60 * 60 * 1000, // 12 小时
      });

      res.cookie("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      });

      return { message: "Token 刷新成功" };
    } catch (error) {
      // 如果是特定的错误类型，保持原有错误信息
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("无效的refresh token");
    }
  }
}
