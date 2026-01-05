import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class TextToSpeechDto {
  @IsString()
  @IsNotEmpty()
  text: string; // 要转换的文本

  @IsOptional()
  @IsString()
  modelType?: string = "1"; // 模型类型，默认值1

  @IsOptional()
  @IsNumber()
  voiceType?: number = 101001; // 音色ID，默认值101001

  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(10)
  volume?: number = 0; // 音量，默认值0，范围[-10, 10]

  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(6)
  speed?: number = 0; // 语速，默认值0，范围[-2, 6]

  @IsOptional()
  @IsString()
  sampleRate?: string = "16000"; // 采样率，默认值16000

  @IsOptional()
  @IsString()
  audioType?: string = "mp3"; // 音频格式，默认值mp3
}

export class TTSResponseDto {
  audio: Buffer; // 音频二进制数据
  contentType: string; // 内容类型
  duration?: number; // 音频时长(秒)
}

export class TTSOriginalResponseDto {
  Audio: string;
  SessionId: string;
  Subtitles: Array<{ Text: string; StartTime: number; EndTime: number }>;
  RequestId: string;
}
