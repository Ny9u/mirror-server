/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, UnauthorizedException, ConflictException, Inject, forwardRef, BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";
import { UserDto, RegisterUserDto, LoginUserDto, AuthResponseDto, UpdateUserDto, UpdatePasswordDto } from "./user.dto";
import * as bcrypt from 'bcrypt';
import { AvatarService } from "../avatar/avatar.service";
import { RefreshTokenService } from "../auth/services/refresh-token.service";
import { JwtPayload } from "../../config/jwt.strategy";

@Injectable()
export class UserService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private avatarService: AvatarService,
    @Inject(forwardRef(() => RefreshTokenService))
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async register(registerUser: RegisterUserDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerUser.email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已注册');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(registerUser.password, 12);
    const user = await this.prisma.user.create({
      data: {
        username: registerUser.username,
        email: registerUser.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async login(loginUser: LoginUserDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginUser.email },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginUser.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    const userAvatar = await this.avatarService.getAvatar(user.id);
    const avatarUrl = userAvatar ? userAvatar.avatarUrl : null;

    // 生成JWT令牌
    const payload: JwtPayload = { sub: updatedUser.id, username: updatedUser.username, email: updatedUser.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.refreshTokenService.generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: avatarUrl,
      },
      token: accessToken,
      refreshToken: refreshToken,
    };
  }

  async findById(userId: number): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }

  async updateUsername(userId: number, updateUser: UpdateUserDto): Promise<UserDto> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: updateUser.username,
        updatedAt: new Date(),
      },
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
    };
  }

  async updatePassword(userId: number, updatePassword: UpdatePasswordDto): Promise<void> {

    // 获取当前用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证旧密码是否正确
    const isOldPasswordValid = await bcrypt.compare(updatePassword.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('密码错误');
    }

    const hashedNewPassword = await bcrypt.hash(updatePassword.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });
  }
  /**
   * 删除用户及其头像数据
   * @param userId 要删除的用户ID
   */
  async deleteAccount(userId: number): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.avatar.deleteMany({
          where: { id: userId },
        }),
        this.prisma.user.delete({
          where: { id: userId },
        }),
      ]);
    } catch (error) {
      throw new Error(`删除用户失败: ${error.message}`);
    }
  }
}
