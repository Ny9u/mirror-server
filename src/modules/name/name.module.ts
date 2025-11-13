import { Module } from "@nestjs/common";
import { NameController } from "./name.controller";
import { NameService } from "./name.service";
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NameController],
  providers: [NameService],
})

export class NameModule {}