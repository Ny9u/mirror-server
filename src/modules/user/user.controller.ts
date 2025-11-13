import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserDto, RegisterUserDto, LoginUserDto, AuthResponseDto } from "./user.dto";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
}