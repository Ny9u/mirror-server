/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Post, Body, Request, HttpCode, HttpStatus, Res, UseGuards, Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatDto } from './chat.dto';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user) {
    // 如果有错误或没有用户，不抛出异常，只返回 null
    // 这样 req.user 在未登录时为 undefined，在已登录时为用户信息
    return user || null;
  }
}

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送聊天消息（流式响应）' })
  @ApiResponse({ status: 200, description: '成功开始流式输出' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 400, description: '请求参数错误或模型配置缺失' })
  async chat(@Request() req, @Body() dto: ChatDto, @Res() res: Response): Promise<void> {
    const userId = req.user?.id;
    
    try {
      const observable = await this.chatService.chatStream(userId, dto);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const subscription = observable.subscribe({
        next: (event) => {
          const data = event.data ? event.data : event;
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        },
        error: () => {
          res.end();
        },
        complete: () => {
          res.end();
        },
      });

      req.on('close', () => {
        subscription.unsubscribe();
      });
    } catch (error: any) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || '流式调用失败',
      });
    }
  }
}
