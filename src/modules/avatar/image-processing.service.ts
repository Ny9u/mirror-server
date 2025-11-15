/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import axios from 'axios';

@Injectable()
export class ImageProcessingService {
  private readonly cacheDir = './cache/thumbnails';

  constructor() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 压缩图片并生成缩略图URL
   * @param imageUrl 原始图片URL
   * @returns 压缩后的图片URL
   */
  async compressImage(imageUrl: string): Promise<string> {
    try {
      const fileName = this.generateFileName(imageUrl);
      const cacheFilePath = join(this.cacheDir, fileName);
      
      // 检查缓存中是否已有处理过的图片
      if (existsSync(cacheFilePath)) {
        return `${process.env.SERVER_BASE_URL || 'http://localhost:3000'}/cache/thumbnails/${fileName}`;
      }
      
      let imageBuffer: Buffer;
      if (imageUrl.startsWith('http')) {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(response.data, 'binary');
      } else if (imageUrl.startsWith('/uploads/')) {
        const imagePath = `.${imageUrl}`;
        if (!existsSync(imagePath)) {
          return imageUrl;
        }
        const fs = require('fs');
        imageBuffer = fs.readFileSync(imagePath);
      } else {
        return imageUrl;
      }
      
      // 使用sharp处理图片
      const compressedImage = await sharp(imageBuffer)
        .resize(200, 200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      // 保存处理后的图片到缓存目录
      writeFileSync(cacheFilePath, compressedImage);
      
      // 返回缓存图片的URL
      return `${process.env.SERVER_BASE_URL || 'http://localhost:3000'}/cache/thumbnails/${fileName}`;
    } catch (error) {
      console.error('图片处理失败:', error);
      // 出错时返回原始URL
      return imageUrl;
    }
  }

  /**
   * 生成基于原始URL的唯一文件名
   * @param imageUrl 原始图片URL
   * @returns 唯一文件名
   */
  private generateFileName(imageUrl: string): string {
    // 生成基于URL的哈希值作为文件名
    const hash = this.hashCode(imageUrl);
    return `${hash}.jpeg`;
  }

  /**
   * 计算字符串的哈希值
   * @param str 输入字符串
   * @returns 哈希值
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString();
  }
}