import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AvatarDto } from "./avatar.dto";


@Injectable()
export class AvatarService {
  constructor(private prisma: PrismaService) {}

  async getAvatar(userId: number): Promise<AvatarDto | null> {
    const avatar = await this.prisma.avatar.findFirst({
      where: { id: userId },
    });

    return avatar ? {
      id: avatar.id,
      avatarUrl: avatar.avatarUrl,
    } : null;
  }
}
