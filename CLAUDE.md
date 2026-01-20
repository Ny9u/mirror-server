# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 NestJS 开发的后端服务项目，为 mirror-chat 前端应用提供 API 服务。项目使用 TypeScript、PostgreSQL（通过 Prisma ORM）和 OpenAI/LangChain 提供智能对话、知识库检索、语音转文字等功能。

## 核心命令

### 开发与构建
```bash
# 安装依赖
npm install --legacy-peer-deps

# 生成 Prisma 客户端（启动前必须执行）
npx prisma generate

# 开发模式（带热重载）
npm run start:dev

# 调试模式
npm run start:debug

# 构建生产版本
npm run build

# 生产模式运行
npm run start:prod
```

### 数据库管理
```bash
# 查看数据库（打开 Prisma Studio）
npx prisma studio

# 迁移数据库（schema 变更后执行）
npx prisma migrate dev

# 清空数据库
npx prisma migrate reset
```

### 代码质量
```bash
# 运行 ESLint 检查并自动修复
npm run lint

# 格式化代码
npm run format

# 运行单元测试
npm test

# 运行 E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

### Docker
```bash
# 构建镜像
docker build -t mirror-server .

# 运行容器
docker run -p 3000:3000 mirror-server
```

## 架构设计

### 模块化架构

项目采用 NestJS 模块化架构，每个功能域都是独立的模块：

**核心基础模块：**
- `PrismaModule`: 数据库连接服务，全局共享
- `AuthModule`: 认证与授权，包含 JWT 策略和 Refresh Token 机制
- `EncryptionModule`: RSA 加密服务，用于敏感数据传输

**业务功能模块：**
- `UserModule`: 用户管理（注册、登录、密码重置）
- `ChatModule`: 对话服务，支持流式响应、思维链、多模态对话，以及 AI 图片生成（阿里云百炼）
- `KnowledgeModule`: 知识库管理，支持向量检索和混合检索
- `ConversationModule`: 对话历史管理
- `RoleModule`: AI 角色管理（系统角色和用户自定义角色）
- `FavoriteModule`: 收藏功能
- `AvatarModule`: 头像上传和处理
- `TTSModule`: 文本转语音（腾讯云）
- `AsrModule`: 语音识别（腾讯云）
- `EmailModule`: 邮件验证码服务

### 认证流程

系统使用双 Token 机制，通过 **HttpOnly Cookie** 存储：
1. **Access Token**: 有效期 12 小时，存储在 `access_token` Cookie 中，用于 API 认证
2. **Refresh Token**: 有效期 7 天，存储在 `refresh_token` Cookie 中，用于刷新 Access Token

**认证实现细节：**
- JWT 策略（`src/config/jwt.strategy.ts`）优先从 Cookie 中提取 token，向后兼容 Authorization header
- 用户登录时会创建 Session 记录（`UserSession` 模型），Refresh Token 与 Session 绑定
- 登出时会清除 Cookie 并删除 Session
- Cookie 配置：
  - `httpOnly: true` - 防止 XSS 攻击
  - `secure: true`（生产环境）- 仅 HTTPS 传输
  - `sameSite: 'lax'` - 防止 CSRF 攻击

**关键接口：**
- `POST /api/v1/user/login`: 登录，设置 Cookie
- `POST /api/v1/auth/refresh`: 刷新 token，从 Cookie 读取并更新
- `POST /api/v1/auth/logout`: 登出，清除 Cookie 和 Session

### 对话服务核心流程

`ChatService.chatStream()` (src/modules/chat/chat.service.ts:76) 实现了完整的对话流程：

1. **配置加载**: 获取用户的模型配置（API Key、Base URL、Model Name）
2. **上下文构建**:
   - 加载用户选择的角色 prompt（通过 `RoleService`）
   - 如果启用知识库，通过向量检索注入相关上下文
   - 加载历史对话（如果 chatId 存在）
3. **多模态支持**:
   - 支持图像分析（URL 或 Base64 格式）
   - 支持文件内容分析（文本文件直接读取，二进制文件 Base64 编码）
   - 自动将图像和文件内容整合到 OpenAI 消息中
4. **流式响应**: 使用 RxJS Observable 实现 SSE 流式输出
5. **对话存储**:
   - 新对话会自动生成标题
   - 支持思维链（reasoning_content）的存储和展示
   - 消息结构化存储为 MessageContentPart 数组
   - 多模态消息会标注附件数量

### 图片生成服务

`ChatService.generateImage()` (src/modules/chat/chat.service.ts:609) 实现了 AI 图片生成功能：

1. **API 集成**: 调用阿里云百炼（DashScope）图片生成 API
   - API 端点: `https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation`
   - 请求格式: 使用 `input.messages` 对话式格式
2. **认证方式**: 使用用户配置的 API Key（优先）或默认环境变量
3. **图文混排支持**:
   - 支持参考图片 URL（`refImg`）
   - 支持参考图片 Base64（`refImgBase64`）
   - 参考模式：`refonly`（仅参考）或 `repaint`（重绘）
   - 图片和文本在 messages 的 content 数组中组合
4. **异步任务轮询**:
   - 自动处理同步和异步响应
   - 异步任务自动轮询（最多 30 次，间隔 2 秒）
5. **参数支持**:
   - 模型选择（默认 `wanx-v1`）
   - 尺寸选项（`1024*1024`, `720*1280`, `1280*720`）
   - 负面提示词（negative_prompt）
   - 随机种子（seed）用于结果复现
   - 生成数量（n，1-4 张）

**关键接口：**
- `POST /api/v1/chat/generate-image`: 生成图片

### 知识库检索架构

`KnowledgeService` (src/modules/knowledge/knowledge.service.ts) 实现了混合检索：

1. **文档解析**: 支持 PDF、DOCX、DOC、TXT、MD、XLSX、XLS
2. **向量化**: 使用 OpenAI Embeddings 和 LangChain 文本分割器
3. **混合检索**: 结合向量相似度检索和关键词匹配
4. **PostgreSQL pgvector**: 使用 `vector(1536)` 类型存储嵌入向量

检索流程使用 RRF (Reciprocal Rank Fusion) 算法融合向量检索和关键词检索结果，提高召回率。

### 加密数据处理

用户敏感接口（注册、登录、密码修改）使用 RSA 加密：
- 前端使用公钥加密，发送 `text/plain` 请求
- `main.ts` 中的 raw body 中间件处理这些路由
- `EncryptionService` 使用私钥解密数据

### 静态文件服务

- `/uploads`: 用户上传文件（头像、知识库文件）
- `/cache/thumbnails`: 图片缩略图缓存
- 服务启动和关闭时会清空 cache 目录

## 数据库设计要点

### 重要模型关系

- `User` 1:1 `ModelConfig`: 用户的个性化模型配置
- `User` 1:N `UserConversation`: 用户的对话列表
- `UserConversation` 1:1 `ConversationDetail`: 对话详情（消息存储为 JSON）
- `User` 1:N `Knowledge`: 用户的知识库文件
- `User` 1:N `UserSession`: 用户的活跃会话
- `User` 1:1 `UserRole`: 用户当前选择的角色
- `Role`: 系统预置角色（`isSystem=true`）和用户自定义角色

### 特殊字段

- `Knowledge.embedding`: PostgreSQL `vector(1536)` 类型，需要 pgvector 扩展
- `Knowledge.fileData`: 存储源文件二进制数据（Bytes 类型）
- `ConversationDetail.content`: JSON 类型，存储消息数组

## 环境配置

项目依赖以下环境变量（在 `prisma/.env` 和项目根目录 `.env` 配置）：

**数据库：**
- `DATABASE_URL`: PostgreSQL 连接 URL（用于迁移）
- `DIRECT_URL`: 直连 URL（用于查询，Supabase 场景）

**认证：**
- `JWT_SECRET`: Access Token 密钥
- `REFRESH_JWT_SECRET`: Refresh Token 密钥
- `FRONTEND_URL`: 前端 URL（用于 CORS 配置，生产环境必须设置）

**OpenAI：**
- `DEFAULT_API_KEY`: 默认 API Key（用户未配置时使用，同时也用于阿里云图片生成）
- `DEFAULT_BASE_URL`: 默认 Base URL

**阿里云百炼（图片生成）：**
- 使用用户在 `ModelConfig` 中配置的 `apiKey`（优先）
- 或使用 `DEFAULT_API_KEY` 环境变量（fallback）
- API 端点：`https://dashscope.aliyuncs.com`

**腾讯云（ASR/TTS）：**
- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`

**邮件服务：**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

## 开发注意事项

### 代码规范
- 启用了 TypeScript 严格空检查（`strictNullChecks: true`）
- ESLint 配置允许 `any` 类型（`no-explicit-any: off`）
- 浮动 Promise 和不安全参数会产生警告

### 常见陷阱
1. **Prisma 客户端**: 修改 schema 后必须运行 `npx prisma generate`
2. **加密路由**: 注册/登录等接口需发送 `Content-Type: text/plain`
3. **知识库向量**: 确保 PostgreSQL 安装了 `pgvector` 扩展
4. **依赖安装**: 必须使用 `--legacy-peer-deps` 标志
5. **Cookie 认证**:
   - 前端请求必须设置 `credentials: 'include'`（fetch/axios）
   - CORS 配置已启用 `credentials: true`
   - 生产环境必须配置 `FRONTEND_URL` 环境变量

### 全局配置
- API 路由前缀: `/api/v1`
- CORS 已启用，`credentials: true`，允许携带 Cookie
- Cookie Parser: 已配置，用于解析请求中的 Cookie
- 全局异常过滤器: `GlobalExceptionFilter`
- 全局响应拦截器: `ResponseInterceptor`
- 全局日志中间件: `LoggingMiddleware`
