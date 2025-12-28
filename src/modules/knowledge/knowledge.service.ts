/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Polyfill for pdf-parse in Node.js environment
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

@Injectable()
export class KnowledgeService {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL or SUPABASE_KEY is not defined');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);

    const openaiApiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  async uploadFile(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    
    const originalname = file.originalname ? Buffer.from(file.originalname, 'latin1').toString('utf8') : '';
    console.log('file:', file, originalname);
    let content = '';
    const fileExtension = originalname.split('.').pop()?.toLowerCase();

    try {
      if (fileExtension === 'pdf') {
        const pdfParser = new PDFParse({ data: file.buffer });
        try {
          const data = await pdfParser.getText();
          content = data.text;
        } finally {
          await pdfParser.destroy();
        }
      } else if (fileExtension === 'docx') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        content = result.value;
      } else if (fileExtension === 'doc') {
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(file.buffer);
        content = extracted.getBody();
      } else if (fileExtension === 'txt' || fileExtension === 'md') {
        content = file.buffer.toString('utf-8');
      } else {
        throw new BadRequestException('不支持的文件格式，仅支持 pdf, docx, doc, txt, md');
      }

      if (!content.trim()) {
        throw new BadRequestException('文件内容为空');
      }

      // // 1. Generate embedding
      // const embeddingResponse = await this.openai.embeddings.create({
      //   model: 'text-embedding-v1',
      //   input: content.substring(0, 8000), 
      // });

      // const embedding = embeddingResponse.data[0].embedding;

      // // 2. Save to database
      // await this.prisma.$executeRaw`
      //   INSERT INTO "Knowledge" ("userId", "fileName", "content", "embedding", "updatedAt")
      //   VALUES (${userId}, ${originalname}, ${content}, ${embedding}::vector, NOW())
      // `;

      return { success: true, fileName: originalname };
    } catch (error) {
      throw new BadRequestException(`处理文件失败: ${error.message}`);
    }
  }

  async search(userId: number, query: string, limit: number = 5) {
    try {
      // 1. Generate query embedding
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-v1',
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // 2. Vector search using Supabase RPC or raw SQL
      // We'll use raw SQL to find the most similar items
      const results: any[] = await this.prisma.$queryRaw`
        SELECT id, "fileName", content, 1 - (embedding <=> ${queryEmbedding}::vector) as similarity
        FROM "Knowledge"
        WHERE "userId" = ${userId}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT ${limit}
      `;

      return { success: true, results };
    } catch (error) {
      console.error('Search error:', error);
      throw new BadRequestException(`搜索失败: ${error.message}`);
    }
  }
}
