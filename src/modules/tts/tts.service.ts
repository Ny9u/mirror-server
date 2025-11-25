/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Tts from 'tencentcloud-sdk-nodejs-tts';
import { TextToSpeechDto, TTSResponseDto } from './tts.dto';

@Injectable()
export class TTSService {
  private readonly logger = new Logger(TTSService.name);
  private readonly ttsClient: any;

  constructor(private readonly configService: ConfigService) {
    const TtsClient = Tts.tts.v20190823.Client;
    const clientConfig = {
      credential: {
        secretId: this.configService.get<string>('TENCENT_SECRET_ID'),
        secretKey: this.configService.get<string>('TENCENT_SECRET_KEY'),
      },
      region: this.configService.get<string>('TENCENT_REGION', 'ap-beijing'),
      profile: {
        httpProfile: {
          endpoint: 'tts.tencentcloudapi.com',
        },
      },
    };
    this.ttsClient = new TtsClient(clientConfig);
  }

  /**
   * 将文本转换为语音
   * @param textToSpeechDto 文本转语音请求参数
   * @returns 包含音频二进制数据的响应对象
   */
  async textToSpeech(textToSpeechDto: TextToSpeechDto): Promise<TTSResponseDto> {
    try {
      const params = {
        Text: textToSpeechDto.text,
        SessionId: this.generateSessionId(),
        ModelType: parseInt(textToSpeechDto.modelType || '1', 10), // 模型类型 可选
        VoiceType: parseInt(textToSpeechDto.voiceType || '1001', 10), // 音色 ID 可选
        Volume: textToSpeechDto.volume || 0, // 音量大小 可选，范围[-10, 10]，默认为0
        Speed: textToSpeechDto.speed || 0, // 语速 可选，范围[-2, 6]，默认为0
        SampleRate: parseInt(textToSpeechDto.sampleRate || '16000', 10), // 采样率 可选，需要转换为数字类型
        Codec: textToSpeechDto.audioType || 'mp3', // 音频编码格式 可选
        PrimaryLanguage: 1, // 主语言 可选 1: 中文，2: 英文
      };

      this.logger.log(`TTS请求参数: ${JSON.stringify(params)}`);
      
      const response = await this.ttsClient.TextToVoice(params);
      
      if (response.Error) {
        this.logger.error(`TTS API错误: ${JSON.stringify(response.Error)}`);
        throw new Error(`TTS API错误: ${response.Error.Message}`);
      }

      // 根据音频格式设置正确的Content-Type
      let contentType = 'audio/mpeg';
      if (textToSpeechDto.audioType === 'wav') {
        contentType = 'audio/wav';
      } else if (textToSpeechDto.audioType === 'pcm') {
        contentType = 'audio/pcm';
      }

      // 返回音频数据
      return {
        audio: Buffer.from(response.Audio, 'base64'),
        contentType,
      };
    } catch (error) {
      this.logger.error(`文本转语音失败: ${error.message}`);
      throw new Error(`文本转语音失败: ${error.message}`);
    }
  }

  /**
   * 生成会话ID
   * @returns 会话ID字符串
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}