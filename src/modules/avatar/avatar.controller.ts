import { Controller , Get , Query, ParseIntPipe } from "@nestjs/common";
import { AvatarService } from "./avatar.service";
import { AvatarDto } from "./avatar.dto";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('avatar')
@Controller('avatar')
export class AvatarController{
  constructor(private readonly avatarService: AvatarService) {}

  @Get()
  @ApiOperation({ summary: '获取用户头像' })
  @ApiResponse({ status: 200, description: '成功获取用户头像' })
  @ApiResponse({ status: 404, description: '用户头像不存在' })
  async getAvatar(@Query('userId', ParseIntPipe) userId: number): Promise<AvatarDto | null> {
    return this.avatarService.getAvatar(userId);
  }
}