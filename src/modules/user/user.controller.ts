import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Req,
  Res,
  RawBodyRequest,
  BadRequestException,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request as ExpressRequest, Response } from "express";
import { UserService } from "./user.service";
import {
  UserDto,
  AuthResponseDto,
  UpdateUserDto,
  VerificationCodeDto,
  VerifyCodeDto,
  ModelConfigDto,
} from "./user.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";

// 定义 JWT 用户信息类型
interface JwtUser {
  id: number;
  email: string;
}

// 定义带有认证信息的请求类型
interface AuthenticatedRequest extends ExpressRequest {
  user: JwtUser;
}

@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  @ApiOperation({ summary: "用户注册" })
  @ApiResponse({ status: 201, description: "用户注册成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async register(
    @Req() req: RawBodyRequest<ExpressRequest>
  ): Promise<AuthResponseDto> {
    // 获取原始请求体（Buffer格式）
    const rawBody = req.rawBody;
    let encryptedData: string;
    // 将Buffer转换为字符串
    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString("utf-8");
    } else if (typeof rawBody === "string") {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException("非法的请求体格式");
    }
    const authResponse = await this.userService.register(encryptedData);

    // 注册成功后不立即设置 Cookie，用户需要登录
    // 只返回用户信息
    return {
      user: authResponse.user,
    };
  }

  @Post("login")
  @ApiOperation({ summary: "用户登录" })
  @ApiResponse({ status: 200, description: "登录成功" })
  @ApiResponse({ status: 401, description: "用户名或密码错误" })
  async login(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    // 获取原始请求体（Buffer格式）
    const rawBody = req.rawBody;
    let encryptedData: string;
    // 将Buffer转换为字符串
    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString("utf-8");
    } else if (typeof rawBody === "string") {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException("非法的请求体格式");
    }
    const authResponse = await this.userService.login(encryptedData);

    // 设置 HttpOnly Cookie
    // Access Token: 12 小时
    res.cookie("access_token", authResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000, // 12 小时
    });

    // Refresh Token: 7 天
    res.cookie("refresh_token", authResponse.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    });

    // 返回用户信息
    return {
      user: authResponse.user,
    };
  }

  @Get()
  @ApiOperation({ summary: "获取用户信息" })
  @ApiResponse({ status: 200, description: "成功获取用户信息" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  async getUser(@Query("id") id: number): Promise<UserDto | null> {
    return this.userService.findById(id);
  }

  @Post("updateInfo")
  @UseGuards(AuthGuard("jwt"))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "更新用户信息（仅用户名）" })
  @ApiResponse({ status: 200, description: "用户信息更新成功" })
  @ApiResponse({ status: 401, description: "未授权或令牌无效" })
  async updateUser(
    @Request() req: AuthenticatedRequest,
    @Body() updateUser: UpdateUserDto
  ): Promise<UserDto> {
    const userId = req.user.id;
    return this.userService.updateUsername(userId, updateUser);
  }

  @Post("updatePassword")
  @UseGuards(AuthGuard("jwt"))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "修改用户密码" })
  @ApiResponse({ status: 200, description: "密码修改成功" })
  @ApiResponse({ status: 400, description: "旧密码错误或新密码与旧密码相同" })
  @ApiResponse({ status: 401, description: "未授权或令牌无效" })
  async updatePassword(
    @Request() req: AuthenticatedRequest,
    @Req() rawReq: RawBodyRequest<ExpressRequest>
  ): Promise<void> {
    // 获取原始请求体（Buffer格式）
    const rawBody = rawReq.rawBody;
    let encryptedData: string;
    // 将Buffer转换为字符串
    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString("utf-8");
    } else if (typeof rawBody === "string") {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException("非法的请求体格式");
    }

    const userId = req.user.id;
    return this.userService.updatePassword(userId, encryptedData);
  }

  @Post("deleteAccount")
  @UseGuards(AuthGuard("jwt"))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "删除用户账户" })
  @ApiResponse({ status: 200, description: "用户删除成功" })
  @ApiResponse({ status: 401, description: "未授权或令牌无效" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  async deleteAccount(@Request() req: AuthenticatedRequest): Promise<void> {
    const userId = req.user.id;
    return this.userService.deleteAccount(userId);
  }

  @Post("sendVerificationCode")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "发送邮箱验证码" })
  @ApiResponse({ status: 200, description: "验证码发送成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async sendVerificationCode(
    @Body() verificationCodeDto: VerificationCodeDto
  ): Promise<void> {
    const type = verificationCodeDto.type || "register";
    return this.userService.sendVerificationCode(
      verificationCodeDto.email,
      type
    );
  }

  @Post("verifyCode")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "验证邮箱验证码" })
  @ApiResponse({ status: 200, description: "验证码验证成功" })
  @ApiResponse({ status: 400, description: "验证码错误" })
  verifyCode(@Body() verifyCodeDto: VerifyCodeDto): boolean {
    return this.userService.verifyCode(verifyCodeDto.email, verifyCodeDto.code);
  }

  @Post("resetPassword")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "重置用户密码" })
  @ApiResponse({ status: 200, description: "密码重置成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async resetPassword(
    @Req() req: RawBodyRequest<ExpressRequest>
  ): Promise<{ message: string }> {
    const rawBody = req.rawBody;
    let encryptedData: string;

    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString("utf-8");
    } else if (typeof rawBody === "string") {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException("非法的请求体格式");
    }

    await this.userService.resetPassword(encryptedData);

    return { message: "密码重置成功" };
  }

  @Post("setModelConfig")
  @UseGuards(AuthGuard("jwt"))
  @UseInterceptors(FileInterceptor(""))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "配置大模型参数" })
  @ApiResponse({ status: 200, description: "配置保存成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  setModelConfig(
    @Request() req: AuthenticatedRequest,
    @Body() configDto: ModelConfigDto
  ) {
    const userId = req.user.id;
    return this.userService.upsertModelConfig(userId, configDto);
  }

  @Post("getModelConfig")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard("jwt"))
  @ApiOperation({ summary: "获取大模型配置" })
  @ApiResponse({ status: 200, description: "获取配置成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getModelConfig(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.userService.getModelConfig(userId);
  }
}
