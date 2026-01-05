import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { KnowledgeService } from "./knowledge.service";
import {
  UploadKnowledgeDto,
  SearchKnowledgeDto,
  ListKnowledgeDto,
  DeleteKnowledgeDto,
  DetailKnowledgeDto,
} from "./knowledge.dto";

@ApiTags("Knowledge")
@Controller("knowledge")
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post("upload")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "上传知识库文件" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "上传成功" })
  async upload(@Body() dto: UploadKnowledgeDto, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("请选择要上传的文件");
    }
    return this.knowledgeService.uploadFile(Number(dto.userId), file);
  }

  @Post("search")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "向量检索知识库" })
  @ApiResponse({ status: 200, description: "检索成功" })
  async search(@Body() dto: SearchKnowledgeDto) {
    return this.knowledgeService.search(
      Number(dto.userId),
      dto.query,
      Number(dto.limit || 5),
      Number(dto.minSimilarity || 0.6)
    );
  }

  @Post("list")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "查询知识库列表" })
  @ApiResponse({ status: 200, description: "查询成功" })
  async list(@Body() dto: ListKnowledgeDto) {
    return this.knowledgeService.getList(
      Number(dto.userId),
      Number(dto.page || 1),
      Number(dto.pageSize || 10)
    );
  }

  @Post("delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "删除知识库文件" })
  @ApiResponse({ status: 200, description: "删除成功" })
  async delete(@Body() dto: DeleteKnowledgeDto) {
    return this.knowledgeService.deleteFile(
      Number(dto.userId),
      Number(dto.id),
      dto.fileName
    );
  }

  @Post("detail")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "获取文件内容详情" })
  @ApiResponse({ status: 200, description: "获取成功" })
  async detail(@Body() dto: DetailKnowledgeDto) {
    return this.knowledgeService.getDetail(Number(dto.userId), Number(dto.id));
  }
}
