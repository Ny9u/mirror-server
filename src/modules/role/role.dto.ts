import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateRoleDto {
  @ApiProperty({ description: "用户ID" })
  @IsNumber()
  userId: number;

  @ApiProperty({ description: "角色名称", example: "技术架构师" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: "角色描述", example: "专业的技术架构设计专家" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: "角色头像URL" })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: "头像背景颜色", example: "#4F46E5" })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  avatarColor?: string;

  @ApiProperty({
    description: "角色prompt提示词",
    example: "你是一位经验丰富的技术架构师，擅长设计高可用、高性能的系统架构...",
  })
  @IsString()
  @MinLength(1)
  prompt: string;
}

export class UpdateRoleDto {
  @ApiProperty({ description: "角色ID" })
  @IsNumber()
  id: number;

  @ApiProperty({ description: "用户ID" })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({ description: "角色名称" })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "角色描述" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: "角色头像URL" })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: "头像背景颜色" })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  avatarColor?: string;

  @ApiPropertyOptional({ description: "角色prompt提示词" })
  @IsString()
  @IsOptional()
  @MinLength(1)
  prompt?: string;
}

export class SelectRoleDto {
  @ApiProperty({ description: "用户ID" })
  @IsNumber()
  userId: number;

  @ApiProperty({ description: "要选择的角色ID" })
  @IsNumber()
  roleId: number;
}

export class RoleResponseDto {
  @ApiProperty({ description: "角色ID" })
  id: number;

  @ApiProperty({ description: "角色名称" })
  name: string;

  @ApiPropertyOptional({ description: "角色描述" })
  description?: string;

  @ApiPropertyOptional({ description: "角色头像URL" })
  avatar?: string;

  @ApiPropertyOptional({ description: "头像背景颜色" })
  avatarColor?: string;

  @ApiProperty({ description: "角色prompt提示词" })
  prompt: string;

  @ApiProperty({ description: "是否为系统预设角色" })
  isSystem: boolean;

  @ApiPropertyOptional({ description: "创建者ID" })
  userId?: number;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;
}

export class UserRoleResponseDto {
  @ApiProperty({ description: "用户角色关联ID" })
  id: number;

  @ApiProperty({ description: "用户ID" })
  userId: number;

  @ApiProperty({ description: "角色ID" })
  roleId: number;

  @ApiPropertyOptional({ description: "角色详情" })
  role?: RoleResponseDto;
}

export class DeleteRoleDto {
  @ApiProperty({ description: "角色ID" })
  @IsNumber()
  id: number;

  @ApiProperty({ description: "用户ID" })
  @IsNumber()
  userId: number;
}

export class ClearRoleDto {
  @ApiProperty({ description: "用户ID" })
  @IsNumber()
  userId: number;
}
