/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Post, Body, Get, Query, UseGuards, Request, HttpStatus, HttpCode } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserDto, RegisterUserDto, LoginUserDto, AuthResponseDto, UpdateUserDto, UpdatePasswordDto } from "./user.dto";
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
  async register(@Body() registerUser: RegisterUserDto): Promise<AuthResponseDto> {
    return this.userService.register(registerUser);
  }

  @Post("login")
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Body() loginUser: LoginUserDto): Promise<AuthResponseDto> {
    return this.userService.login(loginUser);
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
    @Body() updatePassword: UpdatePasswordDto,
  ): Promise<void> {
    const userId = req.user.id;
    return this.userService.updatePassword(userId, updatePassword);
  }
}
