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
      voiceTypes: [
        { id: '1001', name: '智瑜（女声，情感）', language: 'zh' },
        { id: '1002', name: '智聆（女声，新闻）', language: 'zh' },
        { id: '1003', name: '智美（女声，客服）', language: 'zh' },
        { id: '1004', name: '智云（男声，情感）', language: 'zh' },
        { id: '1005', name: '智莉（女声，客服）', language: 'zh' },
        { id: '1006', name: '智华（女声，新闻）', language: 'zh' },
        { id: '1007', name: '智晴（女声，童声）', language: 'zh' },
        { id: '1008', name: '智琪（女声，童声）', language: 'zh' },
        { id: '1009', name: '智小（女声，童声）', language: 'zh' },
        { id: '1010', name: '智颜（女声，情感）', language: 'zh' },
        { id: '1011', name: '智琳（女声，情感）', language: 'zh' },
        { id: '1012', name: '智薇（女声，情感）', language: 'zh' },
        { id: '1013', name: '智娜（女声，情感）', language: 'zh' },
        { id: '1014', name: '智希（女声，情感）', language: 'zh' },
        { id: '1015', name: '智美（女声，情感）', language: 'zh' },
        { id: '1016', name: '智芸（女声，情感）', language: 'zh' },
        { id: '1017', name: '智希（女声，情感）', language: 'zh' },
        { id: '1018', name: '智小（女声，童声）', language: 'zh' },
        { id: '1019', name: '智晓（女声，童声）', language: 'zh' },
        { id: '1020', name: '智云（男声，情感）', language: 'zh' },
        { id: '1050', name: '智伊（女声，英语）', language: 'en' },
        { id: '1051', name: '智娜（女声，英语）', language: 'en' },
        { id: '1052', name: '智希（女声，英语）', language: 'en' },
        { id: '1053', name: '智琳（女声，英语）', language: 'en' },
      ],
    };
  }

  @Get('getVoiceModels')
  @ApiOperation({ summary: '获取支持的模型列表' })
  @ApiResponse({ status: 200, description: '成功返回模型列表' })
  getVoiceModels() {
    return {
      models: [
        { id: '1', name: '默认模型', description: '通用语音合成模型' },
        { id: '2', name: '精品模型', description: '高质量语音合成模型' },
      ],
    };
  }
}