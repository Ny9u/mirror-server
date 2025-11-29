import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AsrDto {
  @ApiPropertyOptional({
    description: '引擎模型类型',
    enum: ['16k_zh', '16k_en', '16k_zh-PY', '8k_zh', '16k_zh_medical'],
    default: '16k_zh',
  })
  @IsOptional()
  @IsString()
  engineModelType?: string = '16k_zh';

  @ApiPropertyOptional({
    description: '音频格式',
    enum: ['wav', 'mp3', 'flac', 'aac', 'm4a'],
    default: 'wav',
  })
  @IsOptional()
  @IsString()
  format?: string = 'wav';

  @ApiPropertyOptional({
    description: '采样率',
    default: 16000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sampleRate?: number = 16000;
}