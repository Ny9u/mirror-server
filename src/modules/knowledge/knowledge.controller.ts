import { Controller, Post, Body, UploadedFile, UseInterceptors, Get, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { UploadKnowledgeDto, SearchKnowledgeDto } from './knowledge.dto';

@ApiTags('Knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传知识库文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '上传成功' })
  async upload(
    @Body() dto: UploadKnowledgeDto,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }
    return this.knowledgeService.uploadFile(Number(dto.userId), file);
  }

  @Get('search')
  @ApiOperation({ summary: '向量检索知识库' })
  @ApiResponse({ status: 200, description: '检索成功' })
  async search(@Query() query: SearchKnowledgeDto) {
    return this.knowledgeService.search(
      Number(query.userId),
      query.query,
      Number(query.limit || 5),
    );
  }
}
