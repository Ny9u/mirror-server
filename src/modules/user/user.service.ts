import { Injectable, UnauthorizedException, ConflictException, Inject, forwardRef } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";
import { UserDto, RegisterUserDto, LoginUserDto, AuthResponseDto, UpdateUserDto } from "./user.dto";
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
}
