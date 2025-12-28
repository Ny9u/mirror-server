import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadKnowledgeDto {
  @ApiProperty({ description: '用户ID' })
  @Type(() => Number)
  @IsNumber()
  userId: number;
}

export class SearchKnowledgeDto {
  @ApiProperty({ description: '用户ID' })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiProperty({ description: '搜索关键词' })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({ description: '返回数量', default: 5 })
  @IsNumber()
  @IsNotEmpty()
  limit: number;
}
