import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConversationService } from "./conversation.service";
import {
  SaveConversationDto,
  GetConversationsDto,
  GetConversationDetailsQueryDto,
  DeleteConversationDto,
} from "./conversation.dto";

@ApiTags("Conversation")
@Controller("conversations")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post("save")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "保存对话" })
  @ApiResponse({ status: 200, description: "保存成功" })
  async save(@Body() dto: SaveConversationDto) {
    return this.conversationService.saveConversation(dto);
  }

  @Get("list")
  @ApiOperation({ summary: "查询对话列表" })
  @ApiResponse({ status: 200, description: "查询成功" })
  async list(@Query() query: GetConversationsDto) {
    return this.conversationService.getConversations(
      query.userId,
      query.includeDetails
    );
  }

  @Post("delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "删除对话" })
  @ApiResponse({ status: 200, description: "删除成功" })
  async delete(@Body() dto: DeleteConversationDto) {
    return this.conversationService.deleteConversation(
      dto.userId,
      dto.conversationId
    );
  }

  @Get("details")
  @ApiOperation({ summary: "查询对话详情" })
  @ApiResponse({ status: 200, description: "查询成功" })
  async details(@Query() query: GetConversationDetailsQueryDto) {
    return this.conversationService.getConversationDetails(
      query.userId,
      query.conversationId
    );
  }
}
