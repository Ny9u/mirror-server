import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";


@Injectable()
export class NameService {
  constructor(private prisma: PrismaService) {}
  getName(userId: number) {
    return this.prisma.name.findMany({
      where: { id: userId },
    });
  }
}