import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { PrismaModule } from "../prisma/prisma.module";
import { UserModule } from "../user/user.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { RoleModule } from "../role/role.module";

@Module({
  imports: [PrismaModule, UserModule, KnowledgeModule, RoleModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
