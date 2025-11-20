/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, UnauthorizedException, ConflictException, Inject, forwardRef, BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";
import { UserDto, RegisterUserDto, LoginUserDto, AuthResponseDto, UpdateUserDto, UpdatePasswordDto } from "./user.dto";
import * as bcrypt from 'bcrypt';
import { AvatarService } from "../avatar/avatar.service";
import { RefreshTokenService } from "../auth/services/refresh-token.service";
import { JwtPayload } from "../../config/jwt.strategy";
import { EncryptionService } from "../encryption/encryption.service";
import { VerificationService } from "../email/verification.service";

@Injectable()
export class UserService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private avatarService: AvatarService,
    private encryptionService: EncryptionService,
    private verificationService: VerificationService,
    @Inject(forwardRef(() => RefreshTokenService))
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async register(registerUser: string): Promise<AuthResponseDto> {
    let decryptedData: RegisterUserDto;
    try {
      const decryptedStr = this.encryptionService.decrypt(registerUser);
      try {
        if (typeof decryptedStr === 'object') {
          decryptedData = decryptedStr;
        } else {
          decryptedData = JSON.parse(decryptedStr);
        }
        
        // 验证必要字段
        if (!decryptedData.username || !decryptedData.email || !decryptedData.password|| !decryptedData.verificationCode) {
          throw new BadRequestException('解密数据格式错误: 缺少必要的字段');
        }
      } catch (jsonError) {
        throw new BadRequestException('解密数据不是有效的JSON格式: ' + jsonError.message);
      }
    } catch (error) {
      throw new BadRequestException('注册数据解密失败: ' + (error.message || '未知错误'));
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: decryptedData.email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已注册');
    }

    // 验证验证码
    const isValid = this.verificationService.verifyCode(decryptedData.email, decryptedData.verificationCode);
    if (!isValid) {
      throw new BadRequestException('验证码错误');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(decryptedData.password, 12);
    const user = await this.prisma.user.create({
      data: {
        username: decryptedData.username,
        email: decryptedData.email,
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

  async login(loginUser: string): Promise<AuthResponseDto> {
    let decryptedData: LoginUserDto;
    try {
      const decryptedStr = this.encryptionService.decrypt(loginUser);
      try {
        // 先检查解密后的数据是否已经是对象
        if (typeof decryptedStr === 'object') {
          decryptedData = decryptedStr;
        } else {
          decryptedData = JSON.parse(decryptedStr);
        }
        
        // 验证必要字段
        if (!decryptedData.email || !decryptedData.password) {
          throw new BadRequestException('解密数据格式错误: 缺少必要的字段');
        }
      } catch (jsonError) {
        throw new BadRequestException('解密数据不是有效的JSON格式: ' + jsonError.message);
      }
    } catch (error) {
      throw new BadRequestException('登录数据解密失败: ' + (error.message || '未知错误'));
    }

    const user = await this.prisma.user.findUnique({
      where: { email: decryptedData.email },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(decryptedData.password, user.password);

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

  async updatePassword(userId: number, updatePassword: string): Promise<void> {
    // 解密密码
    let decryptedData: UpdatePasswordDto;
    
    try {
      const decryptedStr = this.encryptionService.decrypt(updatePassword);
      try {
        // 先检查解密后的数据是否已经是对象
        if (typeof decryptedStr === 'object') {
          decryptedData = decryptedStr;
        } else {
          decryptedData = JSON.parse(decryptedStr);
        }
        
        // 验证必要字段
        if (!decryptedData.oldPassword || !decryptedData.newPassword) {
          throw new BadRequestException('解密数据格式错误: 缺少必要的字段');
        }
      } catch (jsonError) {
        throw new BadRequestException('解密数据不是有效的JSON格式: ' + jsonError.message);
      }
    } catch (error) {
      throw new BadRequestException('密码解密失败: ' + (error.message || '未知错误'));
    }

    // 获取当前用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证旧密码是否正确
    const isOldPasswordValid = await bcrypt.compare(decryptedData.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('旧密码错误');
    }

    const hashedNewPassword = await bcrypt.hash(decryptedData.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });
  }
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

  async sendVerificationCode(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      throw new ConflictException('该邮箱已被使用');
    }

    await this.verificationService.sendVerificationCode(email);
  }

  verifyCode(email: string, code: string): boolean {
    return this.verificationService.verifyCode(email, code);
  }
}
