import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  Injectable,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from "@nestjs/swagger";
import { ChatService } from "./chat.service";
import { ChatDto, ImageData, FileData } from "./chat.dto";
import { Response, Request as ExpressRequest } from "express";
import { AuthGuard } from "@nestjs/passport";
import { UserDto } from "../user/user.dto";
import { readFileSync } from "fs";

// 定义带用户信息的请求接口
interface AuthenticatedRequest extends ExpressRequest {
  user?: UserDto;
}

// 定义 SSE 事件数据接口
interface SseEvent {
  data?: unknown;
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<UserDto>(
    _err: Error | null,
    user: UserDto | false
  ): UserDto | null {
    // 如果有错误或没有用户，不抛出异常，只返回 null
    // 这样 req.user 在未登录时为 undefined，在已登录时为用户信息
    return user || null;
  }
}

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "images", maxCount: 10 }, // 最多 10 张图片
      { name: "files", maxCount: 5 }, // 最多 5 个文件
    ])
  )
  @HttpCode(HttpStatus.OK)
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "发送聊天消息（流式响应，支持多模态）" })
  @ApiResponse({ status: 200, description: "成功开始流式输出" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 400, description: "请求参数错误或模型配置缺失" })
  async chat(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChatDto,
    @Res() res: Response,
    @UploadedFiles()
    uploadedFiles?: {
      images?: Express.Multer.File[];
      files?: Express.Multer.File[];
    }
  ): Promise<void> {
    const userId = req.user?.id;

    try {
      // 处理上传的图片
      if (uploadedFiles?.images && uploadedFiles.images.length > 0) {
        const imageData: ImageData[] = uploadedFiles.images.map((file) => {
          // 将图片转换为 Base64
          const base64 = readFileSync(file.path).toString("base64");
          return {
            base64,
            mimeType: file.mimetype,
          };
        });
         
        const existingImages = dto.images && Array.isArray(dto.images) ? dto.images : [];
         
        dto.images = [...existingImages, ...imageData];
      }

      // 处理上传的文件
      if (uploadedFiles?.files && uploadedFiles.files.length > 0) {
        const fileData: FileData[] = uploadedFiles.files.map((file) => {
          let content: string;
          const isTextFile = file.mimetype.startsWith("text/") ||
                             file.mimetype === "application/json";

          if (isTextFile) {
            // 文本文件直接读取内容
            content = readFileSync(file.path, "utf-8");
          } else {
            // 二进制文件转 Base64
            content = readFileSync(file.path).toString("base64");
          }

          return {
            fileName: file.originalname,
            content,
            mimeType: file.mimetype,
            size: file.size,
          };
        });
         
        const existingFiles = dto.files && Array.isArray(dto.files) ? dto.files : [];
         
        dto.files = [...existingFiles, ...fileData];
      }

      const observable = await this.chatService.chatStream(userId, dto);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const subscription = observable.subscribe({
        next: (event: SseEvent) => {
          const data = event.data ? event.data : event;
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        },
        error: () => {
          res.end();
        },
        complete: () => {
          res.end();
        },
      });

      req.on("close", () => {
        subscription.unsubscribe();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "流式调用失败";
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message,
      });
    }
  }
}
