import { Module } from "@nestjs/common";
import { AvatarController } from "./avatar.controller";
import { AvatarService } from "./avatar.service";
import { PrismaModule } from '../prisma/prisma.module';
import { ImageProcessingService } from './image-processing.service';

@Module({
  imports: [PrismaModule],
  controllers: [AvatarController],
  providers: [AvatarService, ImageProcessingService],
  exports: [AvatarService, ImageProcessingService]
})

export class AvatarModule {}