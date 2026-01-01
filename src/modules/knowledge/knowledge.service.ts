/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import WordExtractor from 'word-extractor';
import pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Polyfill for pdf-parse in Node.js environment
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

@Injectable()
export class KnowledgeService {
  private embeddings: OpenAIEmbeddings;
  private readonly allowedExtensions = ['pdf', 'docx', 'doc', 'txt', 'md', 'xlsx', 'xls'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const openaiApiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    
    this.embeddings = new OpenAIEmbeddings({
      apiKey: openaiApiKey,
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
      modelName: 'text-embedding-v1', // 使用通义千问支持的模型
    });
  }

  async uploadFile(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    const originalname = file.originalname ? Buffer.from(file.originalname, 'latin1').toString('utf8') : '';
    const fileExtension = originalname.split('.').pop()?.toLowerCase() || '';

    if (!this.allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(`不支持的文件格式 "${fileExtension}"`);
    }

    const blob = new Blob([file.buffer]);
    let docs: Document[] = [];

    // 1. 解析文件
    try {
      if (fileExtension === 'pdf') {
        const data = await pdf(file.buffer);
        docs = [new Document({ pageContent: data.text })];
      } else if (fileExtension === 'docx' || fileExtension === 'doc') {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          if (result.value && result.value.trim()) {
            docs = [new Document({ pageContent: result.value })];
          } else {
            try {
              const extractor = new WordExtractor();
              const extracted = await extractor.extract(file.buffer);
              const content = extracted.getBody();
              if (content && content.trim()) {
                docs = [new Document({ pageContent: content })];
              } else {
                throw new Error('WordExtractor 解析结果为空');
              }
            } catch{
              throw new BadRequestException('Word 文件解析失败：文件格式可能已损坏，或者不是有效的 .doc/.docx 文档');
            }
          }
      } else if (fileExtension === 'txt' || fileExtension === 'md') {
        const text = await blob.text();
        docs = [new Document({ pageContent: text })];
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        let fullText = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_csv(worksheet);
          if (sheetText.trim()) {
            fullText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
          }
        });
        docs = [new Document({ pageContent: fullText })];
      }

      if (!docs.length || !docs[0].pageContent.trim()) {
        throw new BadRequestException('文件内容为空');
      }

      // 生成预览内容
      const fullText = docs.map(d => d.pageContent).join('\n');
      const preview = fileExtension === 'md' 
        ? fullText.slice(0, 200) 
        : fullText.replace(/[ \t]+/g, '').slice(0, 200);

      // 优化显示的文件类型
      const displayType = this.getDisplayType(fileExtension, file.mimetype);

      // 2. 使用 LangChain 进行文本切片
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await splitter.splitDocuments(docs);

      // 3. 删除旧的同名文件记录
      await this.prisma.knowledge.deleteMany({
        where: {
          userId,
          fileName: originalname,
        },
      });

      // 4. 生成向量并保存到数据库
      for (const doc of splitDocs) {
        const embedding = await this.embeddings.embedQuery(doc.pageContent);
        const embeddingString = `[${embedding.join(',')}]`;
        
        await this.prisma.$executeRaw`
          INSERT INTO "Knowledge" ("userId", "fileName", "content", "preview", "size", "type", "embedding", "updatedAt")
          VALUES (${userId}, ${originalname}, ${doc.pageContent}, ${preview}, ${file.size}, ${displayType}, ${embeddingString}::vector, NOW())
        `;
      }

      return { success: true, fileName: originalname, type: displayType, chunks: splitDocs.length };
    } catch (error) {
      throw new BadRequestException(`处理文件失败: ${error.message}`);
    }
  }

  private getDisplayType(extension: string, mimetype: string): string {
    const ext = extension.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx' || ext === 'doc') return ext;
    if (ext === 'md') return 'markdown';
    if (ext === 'txt') return 'text';
    if (ext === 'xlsx' || ext === 'xls') return ext;
    return mimetype;
  }

  async search(userId: number, query: string, limit: number = 5) {
    try {
      // 1. 使用 LangChain 生成查询向量
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const queryEmbeddingString = `[${queryEmbedding.join(',')}]`;

      // 2. 向量搜索
      const results: any[] = await this.prisma.$queryRaw`
        SELECT id, "fileName", content, preview, size, type, 1 - (embedding <=> ${queryEmbeddingString}::vector) as similarity
        FROM "Knowledge"
        WHERE "userId" = ${userId}
        ORDER BY embedding <=> ${queryEmbeddingString}::vector
        LIMIT ${limit}
      `;

      return { success: true, results };
    } catch (error) {
      throw new BadRequestException(`搜索失败: ${error.message}`);
    }
  }

  async getList(userId: number, page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;
      
      const [totalResult, list] = await Promise.all([
        this.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT "fileName") as count 
          FROM "Knowledge" 
          WHERE "userId" = ${userId}
        `,
        this.prisma.$queryRaw<any[]>`
          SELECT 
            MAX(id) as id, 
            "fileName", 
            MAX(preview) as preview,
            MAX(size) as size,
            MAX(type) as type,
            MAX("createdAt") as "createdAt", 
            MAX("updatedAt") as "updatedAt"
          FROM "Knowledge"
          WHERE "userId" = ${userId}
          GROUP BY "fileName"
          ORDER BY "createdAt" DESC
          LIMIT ${pageSize} OFFSET ${skip}
        `,
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return { 
        success: true, 
        list,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }
      };
    } catch (error) {
      throw new BadRequestException(`获取列表失败: ${error.message}`);
    }
  }

  async deleteFile(userId: number, id: number, fileName: string) {
    try {
      const record = await this.prisma.knowledge.findFirst({
        where: {
          id,
          userId,
          fileName,
        },
      });

      if (!record) {
        throw new BadRequestException('文件不存在');
      }

      await this.prisma.knowledge.deleteMany({
        where: {
          userId,
          fileName,
        },
      });

      return {
        success: true,
        message: `删除成功`,
      };
    } catch (error) {
      throw new BadRequestException(`删除文件失败: ${error.message}`);
    }
  }

  async getDetail(userId: number, id: number) {
    try {
      const baseRecord = await this.prisma.knowledge.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!baseRecord) {
        throw new BadRequestException('文件不存在或无权查看');
      }

      const allChunks = await this.prisma.knowledge.findMany({
        where: {
          userId,
          fileName: baseRecord.fileName,
        },
        orderBy: {
          id: 'asc',
        },
        select: {
          content: true,
        },
      });

      const fullContent = allChunks.map(chunk => chunk.content).join('');

      return {
        success: true,
        data: {
          id: baseRecord.id,
          fileName: baseRecord.fileName,
          type: baseRecord.type,
          content: fullContent,
        },
      };
    } catch (error) {
      throw new BadRequestException(`获取文件详情失败: ${error.message}`);
    }
  }
}
