import { Module } from "@nestjs/common";
import { AvatarService } from "./avatar.service";
import { AvatarController } from "./avatar.controller";
import { PrismaService } from "../prisma/prisma.service";
import { ImageProcessingService } from "./image-processing.service";

@Module({
  controllers: [AvatarController],
  providers: [AvatarService, PrismaService, ImageProcessingService],
  exports: [AvatarService],
})
export class AvatarModule {}