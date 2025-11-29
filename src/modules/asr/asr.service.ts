/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ASR from 'tencentcloud-sdk-nodejs-asr';

@Injectable()
export class AsrService {
  private asrClient: any;

  constructor(private configService: ConfigService) {
    this.initAsrClient();
  }

  private initAsrClient() {
    const secretId = this.configService.get<string>('TENCENT_SECRET_ID');
    const secretKey = this.configService.get<string>('TENCENT_SECRET_KEY');
    const region = this.configService.get<string>('TENCENT_REGION', 'ap-beijing');

    if (!secretId || !secretKey) {
      throw new Error('腾讯云密钥信息未配置');
    }

    const clientConfig = {
      credential: {
        secretId,
        secretKey,
      },
      region,
      profile: {
        httpProfile: {
          endpoint: 'asr.tencentcloudapi.com',
        },
      },
    };

    this.asrClient = new ASR.asr.v20190614.Client(clientConfig);
  }

  /**
   * 语音识别 - 处理音频文件
   * @param fileBuffer 音频文件缓冲区
   * @param engineModelType 引擎模型类型
   * @returns 识别结果
   */
  async recognizeAudioFile(
    fileBuffer: Buffer,
    engineModelType: string = '16k_zh',
  ) {
    try {
      // 将文件缓冲区转换为Base64
      const audioData = fileBuffer.toString('base64');

      const params = {
        EngineModelType: engineModelType,
        ChannelNum: 1, // 声道数，1-单声道
        ResTextFormat: 1, // 识别结果返回样式
        SourceType: 1, // 语音数据来源，0-语音URL，1-语音数据base64编码
        Data: audioData,
        DataLen: audioData.length,
      };

      // 创建识别任务
      const result = await this.asrClient.CreateRecTask(params);
      
      // 获取任务ID
      const taskId = result.Data.TaskId;
      
      // 轮询获取识别结果
      let recognitionResult;
      let attempts = 0;
      const maxAttempts = 5; // 最多尝试5次
      
      while (attempts < maxAttempts) {
        // 等待一段时间再查询
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResult = await this.asrClient.DescribeTaskStatus({
          TaskId: taskId,
        });
        
        // 检查任务状态
        if (statusResult.Data.Status === 2) { // 状态2表示识别完成
          recognitionResult = statusResult;
          break;
        } else if (statusResult.Data.Status === 3) { // 状态3表示识别失败
          throw new Error(`语音识别失败: ${statusResult.Data.StatusStr || '未知错误'}`);
        }
        
        attempts++;
      }
      
      if (!recognitionResult) {
        throw new Error('语音识别超时，请稍后重试');
      }
      
      return recognitionResult;
    } catch (error) {
      throw new Error(`语音识别失败: ${error.message}`);
    }
  }
}