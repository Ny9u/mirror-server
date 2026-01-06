import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Type } from "class-transformer";

export class UploadKnowledgeDto {
  @ApiProperty({ description: "用户ID" })
  @Type(() => Number)
  @IsNumber()
  userId: number;
}

export class SearchKnowledgeDto {
  @ApiProperty({ description: "用户ID" })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiProperty({ description: "搜索关键词" })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({ description: "返回数量", default: 5 })
  @IsNumber()
  @IsNotEmpty()
  limit: number;

  @ApiProperty({ description: "最小相似度阈值", default: 0.6, required: false })
  @IsNumber()
  minSimilarity?: number = 0.6;
}

export class ListKnowledgeDto {
  @ApiProperty({ description: "用户ID" })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiProperty({ description: "页码", default: 1, required: false })
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: "每页条数", default: 10, required: false })
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 10;

  @ApiProperty({
    description:
      "多类型筛选 (1:pdf, 2:docx, 3:doc, 4:xlsx, 5:xls, 6:text, 7:markdown)",
    required: false,
    type: [Number],
  })
  @IsNumber({}, { each: true })
  types?: number[];
}

export class DeleteKnowledgeDto {
  @ApiProperty({ description: "用户ID" })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiProperty({ description: "文件ID" })
  @Type(() => Number)
  @IsNumber()
  id: number;

  @ApiProperty({ description: "文件名" })
  @IsNotEmpty()
  @IsString()
  fileName: string;
}

export class DetailKnowledgeDto {
  @ApiProperty({ description: "用户ID" })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiProperty({ description: "文件ID" })
  @Type(() => Number)
  @IsNumber()
  id: number;
}

export class DownloadKnowledgeDto {
  @ApiProperty({ description: "用户ID" })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiProperty({ description: "文件ID" })
  @Type(() => Number)
  @IsNumber()
  id: number;
}
