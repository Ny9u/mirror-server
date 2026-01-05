import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
} from "@nestjs/swagger";
import { AsrService } from "./asr.service";
import { AsrDto } from "./asr.dto";
import { Express } from "express";

@ApiTags("ASR")
@Controller("asr")
export class AsrController {
  private readonly logger = new Logger(AsrController.name);

  constructor(private readonly asrService: AsrService) {}

  @Post("recognize")
  @UseInterceptors(FileInterceptor("audio"))
  @ApiOperation({ summary: "语音识别 - 处理前端上传的音频文件" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 200, description: "语音识别成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 500, description: "服务器内部错误" })
  @HttpCode(HttpStatus.OK)
  async recognizeAudioFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AsrDto
  ) {
    try {
      this.logger.log(
        `接收到音频文件: ${file?.originalname}, 大小: ${file?.size} bytes`
      );

      if (!file) {
        return {
          success: false,
          message: "请上传音频文件",
        };
      }
      const engineModelType = body.engineModelType || "16k_zh";

      // 调用ASR服务进行识别
      const result = await this.asrService.recognizeAudioFile(
        file.buffer,
        engineModelType
      );

      return {
        success: true,
        ...result.Data,
        message: "语音识别成功",
      };
    } catch (error) {
      this.logger.error(
        `语音识别失败: ${(error as Error).message || "未知错误"}`
      );
      return {
        success: false,
        message: (error as Error).message || "未知错误",
      };
    }
  }
}
