import { Controller, Get, Query, ParseIntPipe } from "@nestjs/common";
import { NameService } from "./name.service";
import { NameDto } from "./name.dto";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('name')
@Controller('name')
export class NameController {
  constructor(private readonly nameService: NameService) {}

  @Get()
  @ApiOperation({ summary: '获取用户名' })
  @ApiResponse({ status: 200, description: '成功获取用户名' })
  @ApiResponse({ status: 404, description: '用户名不存在' })
  async getName(@Query('userId', ParseIntPipe) userId: number): Promise<NameDto | null> {
    return this.nameService.getName(userId);
  }
}