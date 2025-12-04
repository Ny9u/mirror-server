/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateFavoriteDto,
  RemoveFavoriteDto,
  GetFavoritesDto,
  GetFavoriteDetailDto
} from './favorite.dto';
import * as crypto from 'crypto';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  // 生成基于userId和conversation内容的哈希ID
  private generateContentId(userId, conversation): string {
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    const conversationStr = typeof conversation === 'string' ? conversation : JSON.stringify(conversation);
    
    const hashInput = `${userIdStr}:${conversationStr}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  // 用户收藏
  async addFavorite(createFavoriteDto: CreateFavoriteDto) {
    const { userId, conversation, id, ...contentData } = createFavoriteDto;
    
    const contentId = this.generateContentId(userId, conversation);
    
    // 检查用户是否存在
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!userExists) {
      throw new NotFoundException(`用户不存在`);
    }
    
    // 检查用户是否已经收藏过此内容
    const existingFavorite = await this.prisma.userFavorite.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId,
        },
      },
    });
    
    if (existingFavorite) {
      throw new BadRequestException('该内容已存在');
    }
    
    // 使用事务确保两个操作要么都成功，要么都失败
    return await this.prisma.$transaction(async (tx) => {
      // 创建收藏内容
      const favoriteContent = await tx.favoriteContent.create({
        data: {
          id: contentId,
          conversation,
          ...contentData,
        },
      });
      
      // 创建用户收藏记录
      const userFavorite = await tx.userFavorite.create({
        data: {
          userId,
          contentId,
        },
      });
      
      return {
        success: true,
        message: '收藏成功',
        contentId: userFavorite.contentId,
      };
    });
  }

  // 删除收藏
  async removeFavorite(removeFavoriteDto: RemoveFavoriteDto) {
    const { userId, contentId } = removeFavoriteDto;
    
    // 检查用户收藏记录是否存在
    const userFavorite = await this.prisma.userFavorite.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId,
        },
      },
    });

    if (!userFavorite) {
      throw new NotFoundException(`内容 ${contentId}不存在`);
    }

    // 使用事务确保两个操作要么都成功，要么都失败
    return await this.prisma.$transaction(async (tx) => {
      // 删除用户收藏记录
      await tx.userFavorite.delete({
        where: {
          userId_contentId: {
            userId,
            contentId,
          },
        },
      });

      // 检查是否还有其他用户收藏了这个内容
      const otherFavorites = await tx.userFavorite.findMany({
        where: { contentId },
      });

      // 如果没有其他用户收藏，则删除收藏内容
      if (otherFavorites.length === 0) {
        await tx.favoriteContent.delete({
          where: { id: contentId },
        });
      }

      return {
        success: true,
        message: '删除成功',
      };
    });
  }

  // 获取收藏列表
  async getUserFavorites(getFavoritesDto: GetFavoritesDto) {
    const { userId, page = 1, limit = 20, search, tag } = getFavoritesDto;
    const skip = (page - 1) * limit;

    // 确保userId是整数类型
    const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    // 检查用户是否存在
    const userExists = await this.prisma.user.findUnique({
      where: { id: userIdNumber },
    });
    
    if (!userExists) {
      throw new NotFoundException(`用户ID ${userIdNumber} 不存在`);
    }

    // 先获取用户收藏的内容ID列表
    const userFavorites = await this.prisma.userFavorite.findMany({
      where: { userId: userIdNumber },
      select: { contentId: true },
    });

    const contentIds = userFavorites.map(fav => fav.contentId);

    // 如果没有收藏任何内容，返回空结果
    if (contentIds.length === 0) {
      return {
        success: true,
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // 构建收藏内容的查询条件
    const where: any = {
      id: { in: contentIds },
    };

    // 如果有搜索关键词
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 如果有标签过滤
    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    // 获取总数
    const total = await this.prisma.favoriteContent.count({ where });

    // 获取分页数据
    const favoriteContents = await this.prisma.favoriteContent.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        conversation: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      favorites: favoriteContents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 查询单个收藏
  async getFavoriteDetail(getFavoriteDto: GetFavoriteDetailDto) {
    const { userId, contentId } = getFavoriteDto;
    
    // 确保userId是整数类型
    const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    // 检查用户是否存在
    const userExists = await this.prisma.user.findUnique({
      where: { id: userIdNumber },
    });
    
    if (!userExists) {
      throw new NotFoundException(`用户ID ${userIdNumber} 不存在`);
    }

    // 检查用户是否收藏了此内容
    const userFavorite = await this.prisma.userFavorite.findUnique({
      where: {
        userId_contentId: {
          userId: userIdNumber,
          contentId,
        },
      },
    });

    if (!userFavorite) {
      throw new NotFoundException(`收藏内容 ${contentId} 不属于当前用户`);
    }

    // 获取收藏内容详情
    const favoriteContent = await this.prisma.favoriteContent.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        title: true,
        description: true,
        conversation: true,
        createdAt: true,
      },
    });

    if (!favoriteContent) {
      throw new NotFoundException(`收藏内容 ${contentId} 不存在`);
    }

    return {
      success: true,
      favorite: favoriteContent,
    };
  }
}