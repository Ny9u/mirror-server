# 多模态聊天功能文档

## 概述

聊天模块现已支持多模态输入，允许用户发送文本、图像和文件给 AI 进行分析。

## 功能特性

### 支持的输入类型

1. **文本**: 用户输入的文本消息
2. **图像**: 支持图像分析（需要使用支持视觉的模型，如 GPT-4 Vision）
   - 支持 URL 方式
   - 支持 Base64 编码方式
   - 支持多张图片同时发送（最多 10 张）
3. **文件**: 支持文件内容分析（最多 5 个文件）
   - 文本文件：直接读取内容
   - 二进制文件：Base64 编码后发送

### 支持的文件类型

- **文本文件**: `.txt`, `.md`, `.json`, 等
- **文档文件**: 通过 Base64 编码传输
- **图像文件**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

## API 使用方式

### 接口端点

```
POST /api/v1/chat
```

### 请求格式

支持两种请求方式：

#### 1. JSON 格式（仅文本和 URL 图像）

```json
{
  "content": "请分析这张图片",
  "images": [
    {
      "url": "https://example.com/image.jpg"
    }
  ],
  "chatId": "optional-conversation-id",
  "model": "gpt-4-vision-preview",
  "enableThinking": false,
  "enableSearch": false,
  "enableKnowledge": false
}
```

#### 2. Multipart Form Data（支持文件上传）

```
Content-Type: multipart/form-data

Fields:
- content: "请分析这个文档的内容"
- chatId: "optional-conversation-id"
- model: "gpt-4"
- images: [图片文件1, 图片文件2, ...]
- files: [文档文件1, 文档文件2, ...]
```

### DTO 定义

```typescript
interface ImageData {
  url?: string;           // 图像 URL
  base64?: string;        // Base64 编码的图像
  mimeType?: string;      // MIME 类型
}

interface FileData {
  fileName: string;       // 文件名
  content: string;        // 文件内容或 Base64
  mimeType: string;       // MIME 类型
  size?: number;          // 文件大小（字节）
}

interface ChatDto {
  content: string;        // 文本内容
  images?: ImageData[];   // 图像数组
  files?: FileData[];     // 文件数组
  chatId?: string;        // 对话 ID
  model?: string;         // 模型名称
  enableThinking?: boolean;
  enableSearch?: boolean;
  enableKnowledge?: boolean;
  topK?: number;
  minSimilarity?: number;
}
```

## 前端集成示例

### 使用 Fetch API（文件上传）

```javascript
async function sendMultimodalMessage(text, imageFiles, documentFiles) {
  const formData = new FormData();

  // 添加文本内容
  formData.append('content', text);
  formData.append('model', 'gpt-4-vision-preview');

  // 添加图片
  imageFiles.forEach(file => {
    formData.append('images', file);
  });

  // 添加文档
  documentFiles.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch('/api/v1/chat', {
    method: 'POST',
    body: formData,
    credentials: 'include', // 携带 Cookie
    headers: {
      // 不要设置 Content-Type，让浏览器自动设置
    }
  });

  // 处理 SSE 流式响应
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('Received:', data);
      }
    }
  }
}
```

### 使用 Axios（JSON 格式）

```javascript
import axios from 'axios';

async function sendMessageWithImageURL(text, imageUrl) {
  const response = await axios.post('/api/v1/chat', {
    content: text,
    images: [{ url: imageUrl }],
    model: 'gpt-4-vision-preview'
  }, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    },
    responseType: 'stream'
  });

  // 处理流式响应
  response.data.on('data', (chunk) => {
    const lines = chunk.toString().split('\n\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('Received:', data);
      }
    }
  });
}
```

### React 示例

```jsx
import React, { useState } from 'react';

function ChatWithFiles() {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [response, setResponse] = useState('');

  const handleImageChange = (e) => {
    setImages([...e.target.files]);
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const sendMessage = async () => {
    const formData = new FormData();
    formData.append('content', message);
    formData.append('model', 'gpt-4-vision-preview');

    images.forEach(img => formData.append('images', img));
    files.forEach(file => formData.append('files', file));

    const res = await fetch('/api/v1/chat', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          setResponse(prev => prev + data.content);
        }
      }
    }
  };

  return (
    <div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="输入消息..."
      />

      <div>
        <label>上传图片 (最多10张):</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>

      <div>
        <label>上传文件 (最多5个):</label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
        />
      </div>

      <button onClick={sendMessage}>发送</button>

      <div>
        <h3>AI 回复:</h3>
        <pre>{response}</pre>
      </div>
    </div>
  );
}

export default ChatWithFiles;
```

## 后端实现细节

### 文件处理流程

1. **接收上传**: 使用 `FileFieldsInterceptor` 接收文件
2. **图像处理**:
   - 读取图片文件
   - 转换为 Base64
   - 构建 `data:image/xxx;base64,xxx` 格式的 Data URL
3. **文件处理**:
   - 判断文件类型（文本 vs 二进制）
   - 文本文件直接读取内容
   - 二进制文件转换为 Base64
4. **消息构建**:
   - 将图像添加为 `image_url` 类型的内容部分
   - 将文件内容追加到文本消息中
5. **发送到 AI**: 构建符合 OpenAI API 格式的多模态消息

### 存储格式

存储的消息会包含附件信息：

```json
{
  "role": "user",
  "content": [
    {
      "type": "content",
      "data": "请分析这张图片\n[包含 1 张图片]\n[包含 1 个文件]"
    }
  ],
  "key": "abc123",
  "time": "2026-01-16 10:30:00"
}
```

## 模型兼容性

### 支持多模态的模型

- **GPT-4 Vision**: `gpt-4-vision-preview`, `gpt-4-turbo-vision`
- **GPT-4o**: `gpt-4o`, `gpt-4o-mini`
- **Claude 3**: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`

### 仅支持文本的模型

如果使用不支持视觉的模型（如 GPT-3.5），图像会被忽略，但文件内容仍会被包含在文本中。

## 限制与注意事项

1. **文件大小**: 建议单个文件不超过 10MB
2. **图片数量**: 最多 10 张图片
3. **文件数量**: 最多 5 个文件
4. **支持的图片格式**: JPG, PNG, GIF, WebP
5. **模型选择**: 确保使用支持多模态的模型
6. **API 限制**: 遵守 OpenAI API 的速率限制和 token 限制

## 错误处理

常见错误及解决方案：

- **413 Payload Too Large**: 文件太大，减小文件大小或数量
- **400 Bad Request**: 检查文件格式和 DTO 字段
- **401 Unauthorized**: 确保已登录并携带 Cookie
- **模型不支持**: 切换到支持多模态的模型

## 安全考虑

1. 文件上传已限制数量和类型
2. 临时文件会在处理后自动清理
3. 敏感文件内容不会被永久存储
4. 建议在生产环境添加文件扫描和验证

## 性能优化建议

1. 压缩图片后再上传
2. 大文件使用异步处理
3. 考虑实现文件缓存机制
4. 监控 API 调用成本
