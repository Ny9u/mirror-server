import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { ChatDto } from "./chat.dto";
import OpenAI from "openai";
import * as crypto from "crypto";
import { Observable } from "rxjs";

// 消息内容片段类型
interface MessageContentPart {
  type: "thinking" | "content";
  data: string;
}

// 存储的消息格式
interface StoredMessage {
  role: "system" | "user" | "assistant";
  content: string | MessageContentPart[];
  key?: string;
  time?: string;
  reasoning_content?: string;
  isFinishThinking?: boolean;
}

// SSE 流式响应数据
interface ChatStreamData {
  content: string;
  reasoningContent: string;
  isFinishThinking: boolean;
  chatId: string | undefined;
  key: string;
  time: string;
}

// SSE 事件结构
interface ChatSseEvent {
  data: ChatStreamData;
}

// OpenAI 流式响应 delta 类型
interface StreamDelta {
  content?: string;
  reasoning_content?: string;
}

// OpenAI 流式响应 chunk 类型
interface StreamChunk {
  choices: Array<{
    delta?: StreamDelta;
  }>;
}

// OpenAI 消息参数类型
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  reasoning_content?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly knowledgeService: KnowledgeService
  ) {}

  async chatStream(
    userId: number | undefined,
    dto: ChatDto
  ): Promise<Observable<ChatSseEvent>> {
    // 1. 获取用户模型配置
    const modelConfig = userId
      ? await this.prisma.modelConfig.findUnique({
          where: { userId },
        })
      : null;

    const apiKey =
      modelConfig?.apiKey || this.configService.get<string>("DEFAULT_API_KEY");
    const baseURL =
      modelConfig?.baseURL ||
      this.configService.get<string>("DEFAULT_BASE_URL");
    const modelName = dto.model || "deepseek-v3.1";

    if (!apiKey || !baseURL) {
      throw new BadRequestException("未配置个人 API Key 和 Base URL");
    }

    // 2. 确定 chatId 和获取上下文
    let chatId = dto.chatId;
    let isNewConversation = false;
    let systemContent = "你是一个专业、精准、高效的智能问答助手,名字叫Mirror。";

    // 3. 知识库检索
    if (dto.enableKnowledge && userId) {
      const searchResult = await this.knowledgeService.search(
        userId,
        dto.content,
        dto.topK ?? 5,
        dto.minSimilarity ?? 0.2
      );
      if (searchResult.success && searchResult.results.length > 0) {
        const knowledgeContext = `
          ## 参考资料（按相关性排序）
          ${searchResult.results
            .map(
              (res, i) => `
            ### 资料 ${i + 1} [相似度: ${(res.similarity * 100).toFixed(1)}%]
              - 来源: ${res.fileName}
              - 内容: ${res.content}
            `
            )
            .join("\n\n")}
          ## 回答要求
            1. 优先使用上述参考资料回答
            2. 若资料不足，可结合自身知识补充
        `;
        systemContent += `\n\n以下是与用户问题相关的参考资料，请优先根据这些内容进行回答，若资料不足以回答问题，请根据自己的知识进行回答：\n\n${knowledgeContext}`;
      }
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: systemContent,
      },
    ];

    if (userId) {
      if (chatId) {
        const conversation = await this.prisma.userConversation.findUnique({
          where: { id: chatId },
        });
        if (!conversation) throw new NotFoundException("对话不存在");
        if (conversation.userId !== userId)
          throw new UnauthorizedException("无权访问该对话");

        const details = await this.prisma.conversationDetail.findMany({
          where: { conversationId: chatId },
          orderBy: { createdAt: "asc" },
        });

        details.forEach((detail) => {
          const content = detail.content;
          if (Array.isArray(content)) {
            content.forEach((msg: unknown) => {
              const storedMsg = msg as StoredMessage;
              if (
                storedMsg.role === "assistant" &&
                Array.isArray(storedMsg.content)
              ) {
                let combinedContent = "";
                let reasoningContent = "";
                storedMsg.content.forEach((part) => {
                  if (part.type === "thinking") reasoningContent += part.data;
                  if (part.type === "content") combinedContent += part.data;
                });
                messages.push({
                  role: "assistant",
                  content: combinedContent,
                  reasoning_content: reasoningContent || undefined,
                });
              } else if (
                storedMsg.role === "user" &&
                Array.isArray(storedMsg.content)
              ) {
                let combinedContent = "";
                storedMsg.content.forEach((part) => {
                  if (part.type === "content") combinedContent += part.data;
                });
                messages.push({
                  role: "user",
                  content: combinedContent,
                });
              } else if (
                typeof storedMsg.content === "string" &&
                (storedMsg.role === "user" ||
                  storedMsg.role === "assistant" ||
                  storedMsg.role === "system")
              ) {
                messages.push({
                  role: storedMsg.role,
                  content: storedMsg.content,
                  reasoning_content: storedMsg.reasoning_content,
                });
              }
            });
          } else if (
            typeof content === "object" &&
            content !== null &&
            "role" in content &&
            "content" in content
          ) {
            const storedMsg = content as unknown as StoredMessage;
            if (typeof storedMsg.content === "string") {
              messages.push({
                role: storedMsg.role,
                content: storedMsg.content,
                reasoning_content: storedMsg.reasoning_content,
              });
            }
          }
        });
      } else {
        chatId = crypto.randomUUID();
        isNewConversation = true;
      }
    } else {
      chatId = "";
    }

    const userMessage: StoredMessage = {
      role: "user",
      content: [{ type: "content", data: dto.content }],
      key: this.getRandomKey(),
      time: this.formatChineseTime(new Date()),
    };

    // 给 OpenAI 的消息格式需要保持为字符串或符合其规范的数组
    messages.push({ role: "user", content: dto.content });

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    return new Observable((subscriber) => {
      void (async () => {
        try {
          const stream = (await openai.chat.completions.create({
            model: modelName,
            messages: messages,
            stream: true,
            enable_thinking: dto.enableThinking,
            enable_search: dto.enableSearch,
            stream_options: dto.enableSearch
              ? {
                  include_usage: true,
                  forced_search: dto.enableSearch,
                }
              : undefined,
          } as Parameters<
            typeof openai.chat.completions.create
          >[0])) as AsyncIterable<StreamChunk>;

          let fullReply = "";
          let fullReasoning = "";
          let hasStartedAnswer = false;

          // 预先生成助手的 key 和 time，确保整个流中一致
          const assistantKey = this.getRandomKey();
          const assistantTime = this.formatChineseTime(new Date());

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            const content: string = delta.content || "";
            const reasoning: string = delta.reasoning_content || "";

            if (reasoning) {
              fullReasoning += reasoning;
            }

            if (content) {
              if (!hasStartedAnswer) {
                hasStartedAnswer = true;
              }
              fullReply += content;
            }

            subscriber.next({
              data: {
                content,
                reasoningContent: reasoning,
                isFinishThinking: hasStartedAnswer,
                chatId: chatId || undefined,
                key: assistantKey,
                time: assistantTime,
              },
            });
          }

          // 5. 只有已登录用户才保存对话详情
          if (userId && chatId) {
            const assistantContent: MessageContentPart[] = [];
            if (fullReasoning) {
              assistantContent.push({ type: "thinking", data: fullReasoning });
            }
            if (fullReply) {
              assistantContent.push({ type: "content", data: fullReply });
            }

            // 如果是新对话，先创建对话记录并生成标题
            if (isNewConversation) {
              // 异步生成标题，不阻塞
              const title = await this.generateConversationTitle(
                apiKey,
                baseURL,
                modelName,
                dto.content
              );
              await this.prisma.userConversation.create({
                data: {
                  id: chatId,
                  userId: userId,
                  title: title,
                },
              });
            }

            // 获取已有的对话详情
            const existingDetail =
              await this.prisma.conversationDetail.findFirst({
                where: { conversationId: chatId },
              });

            const newMessages: StoredMessage[] = [
              {
                role: "user",
                content: userMessage.content,
                key: userMessage.key,
                time: userMessage.time,
              },
              {
                role: "assistant",
                content: assistantContent,
                key: assistantKey,
                time: assistantTime,
                isFinishThinking: true,
              },
            ];

            if (existingDetail) {
              const currentContent = Array.isArray(existingDetail.content)
                ? (existingDetail.content as unknown as StoredMessage[])
                : [existingDetail.content as unknown as StoredMessage];

              await this.prisma.conversationDetail.update({
                where: { id: existingDetail.id },
                data: {
                  content: [
                    ...currentContent,
                    ...newMessages,
                  ] as unknown as object[],
                },
              });
            } else {
              // 如果不存在，则创建新记录
              await this.prisma.conversationDetail.create({
                data: {
                  conversationId: chatId,
                  content: newMessages as unknown as object[],
                },
              });
            }

            // 更新对话最后活跃时间
            if (!isNewConversation) {
              await this.prisma.userConversation.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
              });
            }
          }

          subscriber.complete();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "未知错误";
          subscriber.error(
            new BadRequestException(`大模型流式调用失败: ${message}`)
          );
        }
      })();
    });
  }

  /**
   * 生成聊天标题
   * @param apiKey API Key
   * @param baseURL Base URL
   * @param modelName 模型名称
   * @param content 用户发送的第一条消息内容
   * @returns 生成的标题
   */
  private async generateConversationTitle(
    apiKey: string,
    baseURL: string,
    modelName: string,
    content: string
  ): Promise<string> {
    try {
      const openai = new OpenAI({ apiKey, baseURL });
      const titlePrompt: ChatMessage = {
        role: "system",
        content:
          "你是一个专业的标题生成助手。请根据以下对话内容生成一个简洁、准确的标题，标题不超过15个字，不要使用引号或其他标点符号。",
      };

      const titleUserMessage: ChatMessage = {
        role: "user",
        content:
          content.length > 200 ? content.substring(0, 200) + "..." : content,
      };

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [titlePrompt, titleUserMessage] as Parameters<
          typeof openai.chat.completions.create
        >[0]["messages"],
        temperature: 0.7,
        max_tokens: 20,
      });

      let title = response.choices[0]?.message?.content?.trim() || "";
      title = title.replace(/^["'""]+|["'""]+$/g, "");

      return title || "新对话";
    } catch (error: unknown) {
      console.error("生成标题失败: ", error);
      return content.substring(0, 20) || "新对话";
    }
  }

  /**
   * 生成随机 Key
   */
  private getRandomKey(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  /**
   * 格式化中国时间
   */
  private formatChineseTime(date: Date): string {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai",
    })
      .format(date)
      .replace(/\//g, "-");
  }
}
