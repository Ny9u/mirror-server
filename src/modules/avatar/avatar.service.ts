import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AvatarDto } from "./avatar.dto";
import { ImageProcessingService } from "./image-processing.service";


@Injectable()
export class AvatarService {
  constructor(
    private prisma: PrismaService,
    private imageProcessingService: ImageProcessingService
  ) {}

  async getAvatar(userId: number): Promise<AvatarDto | null> {
    const avatar = await this.prisma.avatar.findFirst({
      where: { id: userId },
    });
    const compressedAvatarUrl = avatar?.avatarUrl ? await this.imageProcessingService.compressImage(avatar.avatarUrl) : null;

    return avatar ? {
      id: avatar.id,
      avatarUrl: compressedAvatarUrl ? compressedAvatarUrl : avatar.avatarUrl,
    }: null;
  }
  async getAvatarUrl(userId: number): Promise<string | null> {
    const avatar = await this.getAvatar(userId);
    return avatar ? avatar.avatarUrl : null;
  }
}
