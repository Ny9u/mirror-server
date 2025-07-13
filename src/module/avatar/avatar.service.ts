import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";


@Injectable()
export class AvatarService {
  constructor(private prisma: PrismaService) {}

  getAvatar(userId: number) {
    return this.prisma.avatar.findMany({
      where: { id: userId },
    });
  }
}
