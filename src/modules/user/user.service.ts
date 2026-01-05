import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import {
  UserDto,
  RegisterUserDto,
  LoginUserDto,
  AuthResponseDto,
  UpdateUserDto,
  UpdatePasswordDto,
  ResetPasswordDto,
  ModelConfigDto,
} from "./user.dto";
import * as bcrypt from "bcrypt";
import { AvatarService } from "../avatar/avatar.service";
import { RefreshTokenService } from "../auth/services/refresh-token.service";
import { JwtPayload } from "../../config/jwt.strategy";
import { EncryptionService } from "../encryption/encryption.service";
import { VerificationService } from "../email/verification.service";

// 辅助函数：获取错误消息
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private avatarService: AvatarService,
    private encryptionService: EncryptionService,
    private verificationService: VerificationService,
    @Inject(forwardRef(() => RefreshTokenService))
    private readonly refreshTokenService: RefreshTokenService
  ) {}

  /**
   * 用户注册
   * @param registerUser 加密后的用户注册数据
   * @returns 包含用户信息的认证响应对象
   */
  async register(registerUser: string): Promise<AuthResponseDto> {
    let decryptedData: RegisterUserDto;
    try {
      const decryptedStr = this.encryptionService.decrypt(registerUser);
      try {
        if (typeof decryptedStr === "object") {
          decryptedData = decryptedStr as RegisterUserDto;
        } else {
          decryptedData = JSON.parse(decryptedStr) as RegisterUserDto;
        }

        // 验证必要字段
        if (
          !decryptedData.username ||
          !decryptedData.email ||
          !decryptedData.password ||
          !decryptedData.verificationCode
        ) {
          throw new BadRequestException("解密数据格式错误: 缺少必要的字段");
        }
      } catch (jsonError) {
        throw new BadRequestException(
          "解密数据不是有效的JSON格式: " + getErrorMessage(jsonError)
        );
      }
    } catch (error) {
      throw new BadRequestException(
        "注册数据解密失败: " + getErrorMessage(error)
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: decryptedData.email },
    });

    if (existingUser) {
      throw new ConflictException("该邮箱已注册");
    }

    // 验证验证码
    const isValid = this.verificationService.verifyCode(
      decryptedData.email,
      decryptedData.verificationCode
    );
    if (!isValid) {
      throw new BadRequestException("验证码错误");
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

  /**
   * 用户登录
   * @param loginUser 加密后的用户登录数据
   * @returns 包含用户信息、访问令牌和刷新令牌的认证响应对象
   */
  async login(loginUser: string): Promise<AuthResponseDto> {
    let decryptedData: LoginUserDto;
    try {
      const decryptedStr = this.encryptionService.decrypt(loginUser);
      try {
        // 先检查解密后的数据是否已经是对象
        if (typeof decryptedStr === "object") {
          decryptedData = decryptedStr as LoginUserDto;
        } else {
          decryptedData = JSON.parse(decryptedStr) as LoginUserDto;
        }

        // 验证必要字段
        if (!decryptedData.email || !decryptedData.password) {
          throw new BadRequestException("解密数据格式错误: 缺少必要的字段");
        }
      } catch (jsonError) {
        throw new BadRequestException(
          "解密数据不是有效的JSON格式: " + getErrorMessage(jsonError)
        );
      }
    } catch (error) {
      throw new BadRequestException(
        "登录数据解密失败: " + getErrorMessage(error)
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: decryptedData.email },
    });

    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(
      decryptedData.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("密码错误");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    const userAvatar = await this.avatarService.getAvatar(user.id);
    const avatarUrl = userAvatar ? userAvatar.avatarUrl : null;

    // 生成JWT令牌
    const payload: JwtPayload = {
      sub: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
    };
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

  /**
   * 根据用户ID查找用户
   * @param userId 用户ID
   * @returns 用户信息对象，如果用户不存在则返回null
   */
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

  /**
   * 更新用户名
   * @param userId 用户ID
   * @param updateUser 包含新用户名的对象
   * @returns 更新后的用户信息对象
   */
  async updateUsername(
    userId: number,
    updateUser: UpdateUserDto
  ): Promise<UserDto> {
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

  /**
   * 更新用户密码
   * @param userId 用户ID
   * @param updatePassword 加密后的密码更新数据
   * @returns 无返回值
   */
  async updatePassword(userId: number, updatePassword: string): Promise<void> {
    // 解密密码
    let decryptedData: UpdatePasswordDto;

    try {
      const decryptedStr = this.encryptionService.decrypt(updatePassword);
      try {
        // 先检查解密后的数据是否已经是对象
        if (typeof decryptedStr === "object") {
          decryptedData = decryptedStr as UpdatePasswordDto;
        } else {
          decryptedData = JSON.parse(decryptedStr) as UpdatePasswordDto;
        }

        // 验证必要字段
        if (!decryptedData.oldPassword || !decryptedData.newPassword) {
          throw new BadRequestException("解密数据格式错误: 缺少必要的字段");
        }
      } catch (jsonError) {
        throw new BadRequestException(
          "解密数据不是有效的JSON格式: " + getErrorMessage(jsonError)
        );
      }
    } catch (error) {
      throw new BadRequestException("密码解密失败: " + getErrorMessage(error));
    }

    // 获取当前用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    // 验证旧密码是否正确
    const isOldPasswordValid = await bcrypt.compare(
      decryptedData.oldPassword,
      user.password
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException("旧密码错误");
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
  /**
   * 删除用户账户
   * @param userId 用户ID
   * @returns 无返回值
   */
  async deleteAccount(userId: number): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
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
      throw new Error(`删除用户失败: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 发送验证码
   * @param email 用户邮箱地址
   * @param type 验证码类型，用于区分不同场景（register: 注册, reset: 重置密码）
   * @returns 无返回值
   */
  async sendVerificationCode(
    email: string,
    type: "register" | "reset" = "register"
  ): Promise<void> {
    await this.verificationService.sendVerificationCode(email, type);
  }

  /**
   * 验证验证码
   * @param email 用户邮箱地址
   * @param code 验证码
   * @returns 验证成功返回true
   */
  verifyCode(email: string, code: string): boolean {
    const isValid = this.verificationService.verifyCode(email, code);
    if (!isValid) {
      throw new BadRequestException("验证码错误");
    }
    return true;
  }

  /**
   * 重置密码
   * @param resetData 加密后的密码重置数据
   * @returns 无返回值
   */
  async resetPassword(resetData: string): Promise<void> {
    let decryptedData: ResetPasswordDto;

    try {
      const decryptedStr = this.encryptionService.decrypt(resetData);
      try {
        if (typeof decryptedStr === "object") {
          decryptedData = decryptedStr as ResetPasswordDto;
        } else {
          decryptedData = JSON.parse(decryptedStr) as ResetPasswordDto;
        }

        if (!decryptedData.email || !decryptedData.password) {
          throw new BadRequestException("解密数据格式错误: 缺少必要的字段");
        }
      } catch (jsonError) {
        throw new BadRequestException(
          "解密数据不是有效的JSON格式: " + getErrorMessage(jsonError)
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "重置密码数据解密失败: " + getErrorMessage(error)
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: decryptedData.email },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const isSamePassword = await bcrypt.compare(
      decryptedData.password,
      user.password
    );
    if (isSamePassword) {
      throw new BadRequestException("新密码不能与当前密码相同");
    }

    const hashedNewPassword = await bcrypt.hash(decryptedData.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 更新或创建大模型配置
   * @param userId 用户ID
   * @param configDto 配置数据
   * @returns 更新后的配置
   */
  upsertModelConfig(userId: number, configDto: ModelConfigDto) {
    return this.prisma.modelConfig.upsert({
      where: { userId },
      update: {
        baseURL: configDto.baseURL,
        apiKey: configDto.apiKey,
        modelName: configDto.modelName,
        updatedAt: new Date(),
      },
      create: {
        userId,
        baseURL: configDto.baseURL,
        apiKey: configDto.apiKey,
        modelName: configDto.modelName,
      },
    });
  }

  /**
   * 获取用户的大模型配置
   * @param userId 用户ID
   * @returns 大模型配置
   */
  async getModelConfig(userId: number) {
    return this.prisma.modelConfig.findUnique({
      where: { userId },
    });
  }
}
