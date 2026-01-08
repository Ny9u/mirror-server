import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserSession } from "@prisma/client";

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建新会话，同时删除该用户的所有旧会话（实现单设备登录）
   * @param userId 用户ID
   * @param refreshToken 刷新令牌
   * @param expiresAt 过期时间
   */
  async createSession(
    userId: number,
    refreshToken: string,
    expiresAt: Date
  ): Promise<void> {
    // 使用事务确保原子性：先删除旧会话，再创建新会话
    await this.prisma.$transaction([
      // 删除该用户的所有现有会话
      this.prisma.userSession.deleteMany({
        where: { userId },
      }),
      // 创建新会话
      this.prisma.userSession.create({
        data: {
          userId,
          refreshToken,
          expiresAt,
        },
      }),
    ]);
  }

  /**
   * 验证会话是否有效
   * @param refreshToken 刷新令牌
   * @returns 会话信息，如果无效则返回null
   */
  async validateSession(refreshToken: string): Promise<UserSession | null> {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      return null;
    }

    // 检查是否过期
    if (session.expiresAt < new Date()) {
      // 删除过期会话
      await this.prisma.userSession.delete({
        where: { id: session.id },
      });
      return null;
    }

    return session;
  }

  /**
   * 更新会话的refreshToken（用于token刷新时）
   * @param oldRefreshToken 旧的刷新令牌
   * @param newRefreshToken 新的刷新令牌
   * @param expiresAt 新的过期时间
   */
  async updateSession(
    oldRefreshToken: string,
    newRefreshToken: string,
    expiresAt: Date
  ): Promise<boolean> {
    try {
      await this.prisma.userSession.update({
        where: { refreshToken: oldRefreshToken },
        data: {
          refreshToken: newRefreshToken,
          expiresAt,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除会话（用于登出）
   * @param refreshToken 刷新令牌
   */
  async deleteSession(refreshToken: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { refreshToken },
    });
  }

  /**
   * 删除用户的所有会话
   * @param userId 用户ID
   */
  async deleteAllUserSessions(userId: number): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  /**
   * 清理所有过期的会话
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
