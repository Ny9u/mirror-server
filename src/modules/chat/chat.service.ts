import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { RoleService } from "../role/role.service";
import {
  ChatDto,
  ImageData,
  GenerateImageDto,
  GenerateImageResponseDto,
} from "./chat.dto";
import OpenAI from "openai";
import * as crypto from "crypto";
import { Observable } from "rxjs";
import axios from "axios";

// 存储的消息内容片段类型
interface StoredMessageContentPart {
  type: "thinking" | "content";
  data: string;
}

// 存储的消息格式
interface StoredMessage {
  role: "system" | "user" | "assistant";
  content: string | StoredMessageContentPart[];
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

// OpenAI 消息内容部分（支持多模态）
interface MessageContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

// OpenAI 消息参数类型（支持多模态）
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | MessageContentPart[];
  reasoning_content?: string;
}

// 阿里云图片生成 API 响应类型
interface AliyunImageGenerationResponse {
  output?: {
    task_id?: string;
    task_status?: "SUCCEEDED" | "FAILED" | "PENDING" | "RUNNING";
    results?: Array<{
      url?: string;
      seed?: number;
    }>;
    message?: string;
  };
  message?: string;
}

// 阿里云任务查询响应类型
interface AliyunTaskQueryResponse {
  output?: {
    task_status?: "SUCCEEDED" | "FAILED" | "PENDING" | "RUNNING";
    results?: Array<{
      url?: string;
      seed?: number;
    }>;
    message?: string;
  };
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly knowledgeService: KnowledgeService,
    private readonly roleService: RoleService,
  ) {}

  async chatStream(
    userId: number | undefined,
    dto: ChatDto,
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

    // 校验图片处理模型限制
    if (dto.images && dto.images.length > 0 && modelName !== "qwen3-vl-plus") {
      throw new BadRequestException(
        `模型 "${modelName}" 不支持图片处理，请切换至 "qwen3-vl-plus" 模型。`,
      );
    }

    if (!apiKey || !baseURL) {
      throw new BadRequestException("未配置个人 API Key 和 Base URL");
    }

    // 2. 确定 chatId 和获取上下文
    let chatId = dto.chatId;
    let isNewConversation = false;

    // 获取用户选择的角色prompt，如果没有则使用默认
    let systemContent = userId
      ? await this.roleService.getUserSystemPrompt(userId)
      : "你是一个专业、精准、高效的智能问答助手，名字叫Mirror。";

    // 3. 知识库检索
    if (dto.enableKnowledge && userId) {
      const searchResult = await this.knowledgeService.search(
        userId,
        dto.content,
        dto.topK ?? 5,
        dto.minSimilarity ?? 0.2,
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
            `,
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

        // 处理重新生成/编辑逻辑
        if (dto.isRegenerate && chatId) {
          const detail = await this.prisma.conversationDetail.findFirst({
            where: { conversationId: chatId },
          });

          if (detail && Array.isArray(detail.content)) {
            const currentContent = detail.content as unknown as StoredMessage[];
            if (currentContent.length > 0) {
              // 查找最后一条助理消息和其对应的用户消息
              let lastIndex = currentContent.length - 1;
              if (currentContent[lastIndex].role === "assistant") {
                currentContent.pop();
                lastIndex--;
              }
              if (lastIndex >= 0 && currentContent[lastIndex].role === "user") {
                currentContent.pop();
              }

              await this.prisma.conversationDetail.update({
                where: { id: detail.id },
                data: {
                  content: currentContent as unknown as object[],
                },
              });
            }
          }
        }

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

    // 构建用户消息内容（支持多模态）
    const userContentParts: MessageContentPart[] = [];

    // 添加图像
    if (dto.images && dto.images.length > 0) {
      for (const image of dto.images) {
        let imageUrl: string | undefined;

        if (typeof image === "string") {
          imageUrl = image;
        } else if (typeof image === "object" && image !== null) {
          imageUrl = image.url || image.base64;
        }

        if (imageUrl) {
          if (!imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
            const mimeType =
              typeof image === "object" && image.mimeType
                ? image.mimeType
                : "image/png";
            imageUrl = `data:${mimeType};base64,${imageUrl}`;
          }

          userContentParts.push({
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          });
        }
      }
    }

    // 添加文本内容
    let finalContent = dto.content;

    // 添加文件内容
    if (dto.files && dto.files.length > 0) {
      let filesText = "\n\n以下是用户上传的文件内容：\n";
      for (const file of dto.files) {
        filesText += `\n文件名: ${file.fileName}\n`;
        filesText += `类型: ${file.mimeType}\n`;
        if (file.size) {
          filesText += `大小: ${(file.size / 1024).toFixed(2)} KB\n`;
        }
        filesText += `内容:\n${file.content}\n`;
        filesText += "---\n";
      }
      finalContent += filesText;
    }

    userContentParts.push({
      type: "text",
      text: finalContent,
    });

    const userMessage: StoredMessage = {
      role: "user",
      content: [
        {
          type: "content",
          data: dto.content,
        },
      ],
      key: this.getRandomKey(),
      time: this.formatChineseTime(new Date()),
    };

    // 给 OpenAI 的消息格式（多模态内容）
    messages.push({
      role: "user",
      content:
        userContentParts.length === 1 && userContentParts[0].type === "text"
          ? userContentParts[0].text || dto.content
          : userContentParts,
    });

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
            const assistantContent: StoredMessageContentPart[] = [];
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
                dto.content,
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
            new BadRequestException(`大模型流式调用失败: ${message}`),
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
    content: string,
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

  /**
   * 生成图片（阿里云百炼/DashScope API）
   * @param userId 用户 ID
   * @param dto 图片生成参数
   * @returns 生成的图片 URL
   */
  async generateImage(
    userId: number | undefined,
    dto: GenerateImageDto,
  ): Promise<GenerateImageResponseDto> {
    // 1. 获取用户配置的阿里云 API Key
    const modelConfig = userId
      ? await this.prisma.modelConfig.findUnique({
          where: { userId },
        })
      : null;

    // 优先使用用户配置的 API Key，否则使用默认配置
    const apiKey =
      modelConfig?.apiKey || this.configService.get<string>("DEFAULT_API_KEY");

    if (!apiKey) {
      throw new BadRequestException("未配置阿里云 API Key");
    }

    // 2. 构建请求参数
    const model = dto.model || "wanx-v1";
    const size = dto.size || "1024*1024";
    const n = dto.n || 1;

    // 判断是否有参考图片（图文混排模式）
    const hasRefImage = !!(dto.refImg || dto.refImgBase64);
    const enableInterleave = dto.enableInterleave ?? hasRefImage;

    // 构建请求体
    const requestBody: {
      model: string;
      input: {
        messages: Array<{
          role: string;
          content: Array<{ text?: string; image?: string }> | string;
        }>;
      };
      parameters: {
        size: string;
        n: number;
        seed?: number;
        ref_mode?: string;
        negative_prompt?: string;
        prompt_extend?: boolean;
        watermark?: boolean;
        enable_interleave?: boolean;
      };
    } = {
      model,
      input: {
        messages: [],
      },
      parameters: {
        size,
        n,
      },
    };

    // 统一使用数组格式构建 content，以满足 API 要求
    const messageContent: Array<{
      text?: string;
      image?: string;
    }> = [];

    // 添加文本提示词
    messageContent.push({
      text: dto.prompt,
    });

    // 如果有参考图片，则添加
    if (hasRefImage) {
      if (dto.refImg) {
        messageContent.push({
          image: dto.refImg,
        });
      } else if (dto.refImgBase64) {
        messageContent.push({
          image: `data:image/jpeg;base64,${dto.refImgBase64}`,
        });
      }
    }

    requestBody.input.messages.push({
      role: "user",
      content: messageContent,
    });

    // 如果使用了参考图片或显式启用了图文混排，则设置 enable_interleave
    if (enableInterleave || hasRefImage) {
      requestBody.parameters.enable_interleave = true;
      if (dto.refMode) {
        requestBody.parameters.ref_mode = dto.refMode;
      }
    } else {
      // 纯文本模式也建议使用数组格式，但可以不开启 enable_interleave
      // 某些模型可能要求即便纯文本也要开启，这里先根据逻辑设置
      requestBody.parameters.enable_interleave = false;
    }

    // 添加通用可选参数
    if (dto.negativePrompt) {
      requestBody.parameters.negative_prompt = dto.negativePrompt;
    }

    if (dto.seed !== undefined) {
      requestBody.parameters.seed = dto.seed;
    }

    if (dto.promptExtend !== undefined) {
      requestBody.parameters.prompt_extend = dto.promptExtend;
    }

    if (dto.watermark !== undefined) {
      requestBody.parameters.watermark = dto.watermark;
    }

    try {
      // 3. 调用阿里云 DashScope API
      const response = await axios.post<AliyunImageGenerationResponse>(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation",
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable", // 异步任务
          },
          timeout: 60000, // 60秒超时
        },
      );

      // 4. 处理响应
      const data = response.data;

      if (data.output?.task_status === "SUCCEEDED") {
        // 同步返回成功
        const imageUrl = data.output.results?.[0]?.url;
        if (!imageUrl) {
          throw new BadRequestException("图片生成成功但未返回 URL");
        }

        return {
          url: imageUrl,
          taskId: data.output.task_id,
          seed: data.output.results?.[0]?.seed,
        };
      } else if (
        data.output?.task_status === "PENDING" ||
        data.output?.task_id
      ) {
        // 异步任务，需要轮询查询结果
        const taskId = data.output.task_id;
        if (!taskId) {
          throw new BadRequestException("未返回任务 ID");
        }
        return await this.pollImageGenerationTask(apiKey, taskId);
      } else {
        // 错误响应
        const errorMessage = data.message || "图片生成失败";
        throw new BadRequestException(`阿里云 API 错误: ${errorMessage}`);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | AliyunImageGenerationResponse
          | undefined;
        const errorMessage = errorData?.message || error.message;
        const statusCode = error.response?.status;
        throw new BadRequestException(
          `阿里云图片生成失败 (${statusCode}): ${errorMessage}`,
        );
      }
      throw new BadRequestException(
        `图片生成失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 轮询查询异步图片生成任务状态
   * @param apiKey API Key
   * @param taskId 任务 ID
   * @returns 生成的图片 URL
   */
  private async pollImageGenerationTask(
    apiKey: string,
    taskId: string,
  ): Promise<GenerateImageResponseDto> {
    const maxRetries = 30; // 最多轮询 30 次
    const retryInterval = 2000; // 每 2 秒轮询一次

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get<AliyunTaskQueryResponse>(
          `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        );

        const data = response.data;
        const status = data.output?.task_status;

        if (status === "SUCCEEDED") {
          if (!data.output) {
            throw new BadRequestException("响应数据格式错误");
          }
          const imageUrl = data.output.results?.[0]?.url;
          if (!imageUrl) {
            throw new BadRequestException("图片生成成功但未返回 URL");
          }

          return {
            url: imageUrl,
            taskId,
            seed: data.output.results?.[0]?.seed,
          };
        } else if (status === "FAILED") {
          const errorMessage = data.output?.message || "任务失败";
          throw new BadRequestException(`图片生成失败: ${errorMessage}`);
        } else if (status === "PENDING" || status === "RUNNING") {
          // 继续等待
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        } else {
          throw new BadRequestException(
            `未知任务状态: ${status ?? "undefined"}`,
          );
        }
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data as
            | AliyunTaskQueryResponse
            | undefined;
          const errorMessage = errorData?.output?.message || error.message;
          throw new BadRequestException(`查询任务状态失败: ${errorMessage}`);
        }
        throw error;
      }
    }

    throw new BadRequestException("图片生成超时，请稍后重试");
  }
}
