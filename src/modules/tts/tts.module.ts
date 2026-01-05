import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TTSController } from "./tts.controller";
import { TTSService } from "./tts.service";

@Module({
  imports: [ConfigModule],
  controllers: [TTSController],
  providers: [TTSService],
  exports: [TTSService],
})
export class TTSModule {}
