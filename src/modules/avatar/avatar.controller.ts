import { Controller, Get, Post, Query, ParseIntPipe, UseInterceptors, UploadedFile, Request, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AvatarService } from "./avatar.service";
import { AvatarDto } from "./avatar.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { Express } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserDto } from '../user/user.dto';

type User = UserDto;

interface AuthRequest {
  user: User;
}

@ApiTags('avatar')
@Controller('avatar')
export class AvatarController{
  constructor(private readonly avatarService: AvatarService) {}

  @Get('get')
  @ApiOperation({ summary: '获取用户头像' })
  @ApiResponse({ status: 200, description: '成功获取用户头像' })
  @ApiResponse({ status: 404, description: '用户头像不存在' })
  async getAvatar(@Query('userId', ParseIntPipe) userId: number): Promise<AvatarDto | null> {
    return this.avatarService.getAvatar(userId);
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '上传用户头像' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '头像上传成功' })
  @ApiResponse({ status: 400, description: '无效的请求' })
  @ApiResponse({ status: 401, description: '未授权' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File
  ): Promise<{ avatarUrl: string }> {
    const userId = req.user.id;
    return this.avatarService.uploadAvatar(userId, file);
  }
}