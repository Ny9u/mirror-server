import { IsString, IsOptional, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChatDto {
  @ApiProperty({ description: "用户输入的内容", example: "你好" })
  @IsString()
  @IsNotEmpty()
  content: string;

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
}

export class ChatResponseDto {
  @ApiProperty({ description: "AI回复的内容" })
  content: string;

  @ApiProperty({ description: "AI思考的内容", required: false })
  reasoningContent?: string;

  @ApiProperty({ description: "对话ID" })
  chatId: string;
}
