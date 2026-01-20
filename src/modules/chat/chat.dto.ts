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
  images?: (ImageData | string)[];

  @ApiProperty({
    description: "文件数组（可选），用于文件分析",
    example: [
      { fileName: "document.txt", content: "...", mimeType: "text/plain" },
    ],
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
    description: "是否是重新生成或编辑触发的对话",
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRegenerate?: boolean;

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

// 图片生成请求 DTO
export class GenerateImageDto {
  @ApiProperty({
    description: "图片描述提示词",
    example: "一只可爱的小猫在花园里玩耍"
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({
    description: "模型名称",
    example: "wanx-v1",
    required: false,
    default: "wanx-v1"
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    description: "图片尺寸",
    example: "1024*1024",
    required: false,
    enum: ["1024*1024", "720*1280", "1280*720"],
    default: "1024*1024"
  })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiProperty({
    description: "负面提示词（描述不希望出现的内容）",
    example: "低质量,模糊,变形",
    required: false
  })
  @IsString()
  @IsOptional()
  negativePrompt?: string;

  @ApiProperty({
    description: "参考图片 URL（图文混排）",
    example: "https://example.com/reference.jpg",
    required: false
  })
  @IsString()
  @IsOptional()
  refImg?: string;

  @ApiProperty({
    description: "参考图片 Base64（图文混排）",
    required: false
  })
  @IsString()
  @IsOptional()
  refImgBase64?: string;

  @ApiProperty({
    description: "参考模式（repaint: 重绘, refonly: 仅参考）",
    example: "refonly",
    required: false,
    enum: ["repaint", "refonly"]
  })
  @IsString()
  @IsOptional()
  refMode?: string;

  @ApiProperty({
    description: "生成图片数量",
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
    maximum: 4
  })
  @IsNumber()
  @IsOptional()
  n?: number;

  @ApiProperty({
    description: "随机种子（用于复现结果）",
    required: false
  })
  @IsNumber()
  @IsOptional()
  seed?: number;

  @ApiProperty({
    description: "是否扩展提示词",
    example: true,
    required: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  promptExtend?: boolean;

  @ApiProperty({
    description: "是否添加水印",
    example: false,
    required: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  watermark?: boolean;

  @ApiProperty({
    description: "是否启用图文混排（用于参考图片生成）",
    example: true,
    required: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  enableInterleave?: boolean;
}

// 图片生成响应 DTO
export class GenerateImageResponseDto {
  @ApiProperty({ description: "生成的图片 URL" })
  url: string;

  @ApiProperty({ description: "任务ID", required: false })
  taskId?: string;

  @ApiProperty({ description: "使用的随机种子", required: false })
  seed?: number;
}
