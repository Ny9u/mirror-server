import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsArray,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// 图像数据接口
export interface ImageData {
  url?: string; // 图像 URL
  base64?: string; // 或 Base64 编码的图像数据
  mimeType?: string; // 图像 MIME 类型，如 image/jpeg, image/png
}

// 文件数据接口
export interface FileData {
  fileName: string; // 文件名
  content: string; // 文件内容（文本）或 Base64（二进制）
  mimeType: string; // 文件 MIME 类型
  size?: number; // 文件大小（字节）
}

export class ChatDto {
  @ApiProperty({ description: "用户输入的内容", example: "你好" })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: "图像数组（可选），支持 URL 或 Base64",
    example: [{ url: "https://example.com/image.jpg" }],
    required: false,
  })
  @IsArray()
  @IsOptional()
  images?: ImageData[];

  @ApiProperty({
    description: "文件数组（可选），用于文件分析",
    example: [{ fileName: "document.txt", content: "...", mimeType: "text/plain" }],
    required: false,
  })
  @IsArray()
  @IsOptional()
  files?: FileData[];

  @ApiProperty({
    description:
      "对话ID，首次调用时不传，后端生成并返回，后续调用带上以维持上下文",
    example: "conv_123456",
    required: false,
  })
  @IsString()
  @IsOptional()
  chatId?: string;

  @ApiProperty({
    description: "指定使用的模型名称，如 gpt-4, gpt-3.5-turbo 等",
    example: "gpt-4",
    required: false,
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    description: "是否开启深度思考",
    example: false,
    required: false,
  })
  @IsOptional()
  enableThinking?: boolean;

  @ApiProperty({
    description: "是否开启联网搜索",
    example: false,
    required: false,
  })
  @IsOptional()
  enableSearch?: boolean;

  @ApiProperty({
    description: "是否启用知识库",
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  enableKnowledge?: boolean;

  @ApiProperty({
    description: "知识库检索TopK",
    example: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  topK?: number;

  @ApiProperty({
    description: "知识库检索相似度阈值",
    example: 0.5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minSimilarity?: number;
}

export class ChatResponseDto {
  @ApiProperty({ description: "AI回复的内容" })
  content: string;

  @ApiProperty({ description: "AI思考的内容", required: false })
  reasoningContent?: string;

  @ApiProperty({ description: "对话ID" })
  chatId: string;
}
