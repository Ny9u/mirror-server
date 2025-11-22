/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Post, Body, Get, Query, UseGuards, Request, HttpStatus, HttpCode, Req, RawBodyRequest, BadRequestException } from "@nestjs/common";
import { Request as ExpressRequest } from 'express';
import { UserService } from "./user.service";
import { UserDto, AuthResponseDto, UpdateUserDto, VerificationCodeDto, VerifyCodeDto } from "./user.dto";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from "@nestjs/passport";

@ApiTags('user')
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '用户注册成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async register(@Req() req: RawBodyRequest<ExpressRequest>): Promise<AuthResponseDto> {
    // 获取原始请求体（Buffer格式）
    const rawBody = req.rawBody;
    let encryptedData: string;
    // 将Buffer转换为字符串
    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString('utf-8');
    } else if (typeof rawBody === 'string') {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException('非法的请求体格式');
    }
    return this.userService.register(encryptedData);
  }

  @Post("login")
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Req() req: RawBodyRequest<ExpressRequest>): Promise<AuthResponseDto> {
    // 获取原始请求体（Buffer格式）
    const rawBody = req.rawBody;
    let encryptedData: string;
    // 将Buffer转换为字符串
    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString('utf-8');
    } else if (typeof rawBody === 'string') {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException('非法的请求体格式');
    }
    return this.userService.login(encryptedData);
  }

  @Get()
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ status: 200, description: '成功获取用户信息' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUser(@Query("id") id: number): Promise<UserDto | null> {
    return this.userService.findById(id);
  }

  @Post("updateInfo")
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新用户信息（仅用户名）' })
  @ApiResponse({ status: 200, description: '用户信息更新成功' })
  @ApiResponse({ status: 401, description: '未授权或令牌无效' })
  async updateUser(
    @Request() req,
    @Body() updateUser: UpdateUserDto,
  ): Promise<UserDto> {
    const userId = req.user.id;
    return this.userService.updateUsername(userId, updateUser);
  }

  @Post("updatePassword")
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改用户密码' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '旧密码错误或新密码与旧密码相同' })
  @ApiResponse({ status: 401, description: '未授权或令牌无效' })
  async updatePassword(
    @Request() req,
    @Req() rawReq: RawBodyRequest<ExpressRequest>,
  ): Promise<void> {
    // 获取原始请求体（Buffer格式）
    const rawBody = rawReq.rawBody;
    let encryptedData: string;
    // 将Buffer转换为字符串
    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString('utf-8');
    } else if (typeof rawBody === 'string') {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException('非法的请求体格式');
    }
    
    const userId = req.user.id;
    return this.userService.updatePassword(userId, encryptedData);
  }

  @Post("deleteAccount")
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除用户账户' })
  @ApiResponse({ status: 200, description: '用户删除成功' })
  @ApiResponse({ status: 401, description: '未授权或令牌无效' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async deleteAccount(@Request() req): Promise<void> {
    const userId = req.user.id;
    return this.userService.deleteAccount(userId);
  }

  @Post("sendVerificationCode")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送邮箱验证码' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async sendVerificationCode(@Body() verificationCodeDto: VerificationCodeDto): Promise<void> {
    return this.userService.sendVerificationCode(verificationCodeDto.email);
  }

  @Post("verifyCode")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱验证码' })
  @ApiResponse({ status: 200, description: '验证码验证成功' })
  @ApiResponse({ status: 400, description: '验证码错误' })
  verifyCode(@Body() verifyCodeDto: VerifyCodeDto): boolean {
    return this.userService.verifyCode(verifyCodeDto.email, verifyCodeDto.code);
  }

  @Post('resetPassword')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置用户密码' })
  @ApiResponse({ status: 200, description: '密码重置成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async resetPassword(@Req() req: RawBodyRequest<ExpressRequest>): Promise<{ message: string }> {
    const rawBody = req.rawBody;
    let encryptedData: string;
    
    if (Buffer.isBuffer(rawBody)) {
      encryptedData = rawBody.toString('utf-8');
    } else if (typeof rawBody === 'string') {
      encryptedData = rawBody;
    } else {
      throw new BadRequestException('非法的请求体格式');
    }
    
    await this.userService.resetPassword(encryptedData);
    
    return { message: '密码重置成功' };
  }
}
