import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NameDto } from "./name.dto";


@Injectable()
export class NameService {
  constructor(private prisma: PrismaService) {}
  
  async getName(userId: number): Promise<NameDto | null> {
    const name = await this.prisma.name.findFirst({
      where: { id: userId },
    });
    
    return name ? {
      id: name.id,
      userName: name.userName,
    }: null;
  }
}