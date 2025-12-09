/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException, UnauthorizedException  } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveConversationDto } from './conversation.dto';
import * as crypto from 'crypto';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  private generateConversationId(userId: number, title?: string, content?: any): string {
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    const titleStr = typeof title === 'string' ? title : '';
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const hashInput = `${userIdStr}:${titleStr}:${contentStr}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  async saveConversation(dto: SaveConversationDto) {
    let currentConversationId: string;

    if (dto.conversationId) {
      currentConversationId = dto.conversationId;

      const existingConversation = await this.prisma.userConversation.findUnique({
        where: { id: currentConversationId },
      });

      if (!existingConversation || existingConversation.userId !== Number(dto.userId)) {
        throw new UnauthorizedException('对话不存在');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.userConversation.update({
          where: { id: currentConversationId },
          data: {
            ...(dto.title && { title: dto.title }),
            updatedAt: new Date(), 
          },
        });

        if (dto.content) {
          await tx.conversationDetail.updateMany({
              where: { conversationId: currentConversationId },
              data: {
                content: dto.content,
                updatedAt: new Date(), 
              },
            });
        }
      });
    } else {
      currentConversationId = this.generateConversationId(Number(dto.userId), dto.title, dto.content);

      const parsedContent = JSON.parse(dto.content as string);
      if (Array.isArray(parsedContent) && parsedContent.length > 0) {
        parsedContent[0].conversationId = currentConversationId;
        dto.content = JSON.stringify(parsedContent);
      }

      await this.prisma.$transaction(async (tx) => {
        const conv = await tx.userConversation.create({
          data: {
            id: currentConversationId,
            userId: Number(dto.userId),
            title: dto.title as string,
          },
        });
        await tx.conversationDetail.create({
          data: {
            conversationId: conv.id,
            content: dto.content,
          },
        });
      });
    }

    return { success: true, conversationId: currentConversationId };
  }

  async getConversations(userId: number) {
    const list = await this.prisma.userConversation.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    return { success: true, conversations: list };
  }

  async deleteConversation(userId: number, conversationId: string) {
    const conversation = await this.prisma.userConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }
    if (conversation.userId !== userId) {
      throw new UnauthorizedException('未授权');
    }
    await this.prisma.userConversation.delete({ where: { id: conversationId } });
    return { success: true };
  }

  async getConversationDetails(userId: number, conversationId: string) {
    const conversation = await this.prisma.userConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }
    if (conversation.userId !== Number(userId)) {
      throw new UnauthorizedException('未授权');
    }
    const detail = await this.prisma.conversationDetail.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });

    return { success: true, content: detail.map(d => d.content) };
  }
}
