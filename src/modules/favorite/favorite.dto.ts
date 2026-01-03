import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

// 创建收藏DTO
export class CreateFavoriteDto {
  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @ApiProperty({
    description: '收藏内容ID，如果不提供则自动生成UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: '对话ID',
    example: 'conv_123456',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: '消息Key',
    example: 'key_123456',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: '收藏描述',
    example: '讨论了人工智能的发展和应用',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '标签',
    example: ['AI', '技术'],
    required: false,
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// 删除收藏DTO
export class RemoveFavoriteDto {
  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @ApiProperty({
    description: '收藏内容ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  contentId: string;
}

// 获取收藏列表DTO
export class GetFavoritesDto {
  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @ApiProperty({
    description: '页码',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({
    description: '搜索关键词',
    example: '人工智能',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '标签过滤',
    example: 'AI',
    required: false,
  })
  @IsOptional()
  @IsString()
  tag?: string;
}

// 查询单个收藏DTO
export class GetFavoriteDetailDto {
  @ApiProperty({
    description: '收藏内容ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  contentId: string;
}