/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import * as NodeRSA from 'node-rsa';

@Injectable()
export class EncryptionService {
  private static keyPairInstance: NodeRSA;
  private readonly keyPair: NodeRSA;

  constructor() {
    // 单例模式
    if (!EncryptionService.keyPairInstance) {
      EncryptionService.keyPairInstance = new NodeRSA({ b: 1024 });
      EncryptionService.keyPairInstance.setOptions({
        encryptionScheme: 'pkcs1',
        environment: 'browser'
      });
    }
    this.keyPair = EncryptionService.keyPairInstance;
  }

  /**
   * 获取公钥用于前端加密
   * @returns PEM格式的公钥字符串
   */
  getPublicKey(): string {
    return this.keyPair.exportKey('pkcs8-public-pem');
  }

  /**
   * 解密前端发送的加密数据
   * @param encryptedData Base64编码的加密字符串
   * @returns 解密后的原始数据
   */
  decrypt(encryptedData: string){
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      return this.keyPair.decrypt(buffer, 'utf8');
    } catch (error) {
      throw new Error('解密失败: ' + error.message);
    }
  }
}