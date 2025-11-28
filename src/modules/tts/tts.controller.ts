/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Post, Body, Res, HttpStatus, HttpCode, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { TTSService } from './tts.service';
import { TextToSpeechDto } from './tts.dto';

@ApiTags('TTS - 文本转语音')
@Controller('tts')
export class TTSController {
  constructor(private readonly ttsService: TTSService) {}

  @Post('textToSpeech')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '文本转语音' })
  @ApiResponse({
    status: 200,
    description: '成功返回音频二进制数据',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @ApiConsumes('application/json')
  async textToSpeech(
    @Body() textToSpeechDto: TextToSpeechDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.ttsService.textToSpeech(textToSpeechDto);
      
      // 设置响应头
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Length', result.audio.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      // 发送音频数据
      res.status(HttpStatus.OK).send(result.audio);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  @Get('getVoiceLists')
  @ApiOperation({ summary: '获取支持的音色列表' })
  @ApiResponse({ status: 200, description: '成功返回音色列表' })
  getVoiceLists() {
    return {
      voices: [
        // 大模型音色列表
        { id: 501000, name: '智斌', description: ['阅读男声', '中性'], language: 'zh' },
        { id: 501001, name: '智兰', description: ['资讯女声', '中性'], language: 'zh' },
        { id: 501002, name: '智菊', description: ['阅读女声', '中性'], language: 'zh' },
        { id: 501003, name: '智宇', description: ['阅读男声', '中性'], language: 'zh' },
        { id: 501004, name: '月华', description: ['聊天女声', '中性'], language: 'zh' },
        { id: 501005, name: '飞镜', description: ['聊天男声', '中性'], language: 'zh' },
        { id: 501006, name: '千嶂', description: ['聊天男声', '中性'], language: 'zh' },
        { id: 501007, name: '浅草', description: ['聊天男声', '中性'], language: 'zh' },
        { id: 501008, name: 'WeJames', description: ['外语男声', '中性'], language: 'en' },
        { id: 501009, name: 'WeWinny', description: ['外语女声', '中性'], language: 'en' },
        { id: 601000, name: '爱小溪', description: ['聊天女声', '丰富'], language: 'zh' },
        { id: 601001, name: '爱小洛', description: ['阅读女声', '丰富'], language: 'zh' },
        { id: 601002, name: '爱小辰', description: ['聊天男声', '丰富'], language: 'zh' },
        { id: 601003, name: '爱小荷', description: ['阅读女声', '丰富'], language: 'zh' },
        { id: 601004, name: '爱小树', description: ['资讯男声', '丰富'], language: 'zh' },
        { id: 601005, name: '爱小静', description: ['聊天女声', '丰富'], language: 'zh' },
        { id: 601006, name: '爱小耀', description: ['阅读男声', '丰富'], language: 'zh' },
        { id: 601007, name: '爱小叶', description: ['聊天女声', '中性'], language: 'zh' },
        { id: 601008, name: '爱小豪', description: ['聊天男声', '中性'], language: 'zh' },
        { id: 601009, name: '爱小芊', description: ['聊天女声', '丰富'], language: 'zh' },
        { id: 601010, name: '爱小娇', description: ['聊天女声', '丰富'], language: 'zh' },
        { id: 601011, name: '爱小川', description: ['聊天男声', '中性'], language: 'zh' },
        { id: 601012, name: '爱小璟', description: ['特色女声', '中性'], language: 'zh' },
        { id: 601013, name: '爱小伊', description: ['阅读女声', '中性'], language: 'zh' },
        { id: 601014, name: '爱小简', description: ['聊天男声', '中性'], language: 'zh' },
        { id: 601015, name: '爱小童', description: ['男童声', '丰富'], language: 'zh' },
        // 精品音色列表
        { id: 101001, name: '智瑜', description: ['情感女声', '中性'], language: 'zh' },
        { id: 101004, name: '智云', description: ['通用男声', '中性'], language: 'zh' },
        { id: 101011, name: '智燕', description: ['新闻女声', '中性'], language: 'zh' },
        { id: 101013, name: '智辉', description: ['新闻男声', '中性'], language: 'zh' },
        { id: 101015, name: '智萌', description: ['男童声', '中性'], language: 'zh' },
        { id: 101016, name: '智甜', description: ['女童声', '中性'], language: 'zh' },
        { id: 101019, name: '智彤', description: ['粤语女声', '中性'], language: 'zh' },
        { id: 101021, name: '智瑞', description: ['新闻男声', '中性'], language: 'zh' },
        { id: 101026, name: '智希', description: ['通用女声', '中性'], language: 'zh' },
        { id: 101027, name: '智梅', description: ['通用女声', '中性'], language: 'zh' },
        { id: 101030, name: '智柯', description: ['通用男声', '中性'], language: 'zh' },
        { id: 101050, name: 'WeJack', description: ['英文男声', '中性'], language: 'en' },
        { id: 101054, name: '智友', description: ['通用男声', '中性'], language: 'zh' },
        { id: 101055, name: '智付', description: ['通用女声', '中性'], language: 'zh' },
        { id: 301037, name: '爱小静', description: ['对话女声', '中性'], language: 'zh' },
      ],
    };
  }
}