# 图片生成 API 测试指南

## 接口信息

- **端点**: `POST /api/v1/chat/generate-image`
- **认证**: 可选（支持已登录和未登录用户）
- **Content-Type**: `application/json`
- **阿里云 API**: DashScope 图片生成服务（使用 messages 格式）

## 请求示例

### 1. 基础图片生成（纯文本）

```bash
curl -X POST http://localhost:3000/api/v1/chat/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_ACCESS_TOKEN" \
  -d '{
    "prompt": "一只可爱的小猫在花园里玩耍，阳光明媚，高清摄影",
    "promptExtend": true,
    "watermark": false
  }'
```

### 2. 指定尺寸和模型

```bash
curl -X POST http://localhost:3000/api/v1/chat/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_ACCESS_TOKEN" \
  -d '{
    "prompt": "未来科幻城市，霓虹灯光，赛博朋克风格",
    "model": "wanx-v1",
    "size": "1280*720"
  }'
```

### 3. 使用负面提示词

```bash
curl -X POST http://localhost:3000/api/v1/chat/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_ACCESS_TOKEN" \
  -d '{
    "prompt": "美丽的山水画，中国风，水墨画风格",
    "negativePrompt": "低质量,模糊,变形,噪点",
    "size": "1024*1024"
  }'
```

### 4. 图文混排 - 参考图片 URL

```bash
curl -X POST http://localhost:3000/api/v1/chat/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_ACCESS_TOKEN" \
  -d '{
    "prompt": "将这张图片转换为动漫风格",
    "refImg": "https://example.com/reference.jpg",
    "refMode": "refonly",
    "size": "1024*1024"
  }'
```

### 5. 图文混排 - Base64 参考图片

```bash
curl -X POST http://localhost:3000/api/v1/chat/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_ACCESS_TOKEN" \
  -d '{
    "prompt": "保持人物特征，改变背景为森林",
    "refImgBase64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "refMode": "repaint",
    "size": "1024*1024"
  }'
```

### 6. 指定随机种子（用于复现结果）

```bash
curl -X POST http://localhost:3000/api/v1/chat/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_ACCESS_TOKEN" \
  -d '{
    "prompt": "宇宙星空，银河系，深空摄影",
    "seed": 12345,
    "size": "1024*1024"
  }'
```

### 7. 生成多张图片

```bash
curl -X POST http://localhost:3000/api/v1/chat/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_ACCESS_TOKEN" \
  -d '{
    "prompt": "现代简约风格室内设计",
    "n": 4,
    "size": "1024*1024"
  }'
```

## 响应格式

### 成功响应

```json
{
  "url": "https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.png",
  "taskId": "task-123456",
  "seed": 42
}
```

### 错误响应

```json
{
  "statusCode": 400,
  "message": "未配置阿里云 API Key"
}
```

## 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| prompt | string | 是 | 图片描述提示词 |
| model | string | 否 | 模型名称（默认: wanx-v1） |
| size | string | 否 | 图片尺寸（1024*1024, 720*1280, 1280*720） |
| negativePrompt | string | 否 | 负面提示词 |
| refImg | string | 否 | 参考图片 URL（图文混排） |
| refImgBase64 | string | 否 | 参考图片 Base64（图文混排） |
| refMode | string | 否 | 参考模式（refonly/repaint） |
| n | number | 否 | 生成图片数量（1-4，默认: 1） |
| seed | number | 否 | 随机种子 |
| promptExtend | boolean | 否 | 是否扩展提示词（默认: false） |
| watermark | boolean | 否 | 是否添加水印（默认: false） |
| enableInterleave | boolean | 否 | 是否启用图文混排（有参考图片时自动为 true） |

## 使用前端 axios 调用

### 纯文本生成图片

```javascript
import axios from 'axios';

async function generateImage() {
  try {
    const response = await axios.post('/api/v1/chat/generate-image', {
      prompt: '一只可爱的小猫在花园里玩耍',
      size: '1024*1024',
      model: 'wanx-v1',
      promptExtend: true,  // 自动优化提示词
      watermark: false     // 不添加水印
    }, {
      withCredentials: true // 携带 Cookie
    });

    console.log('生成的图片 URL:', response.data.url);
    return response.data;
  } catch (error) {
    console.error('图片生成失败:', error.response?.data?.message);
  }
}
```

### 图文混排（参考图片生成）

```javascript
async function generateImageWithReference() {
  try {
    const response = await axios.post('/api/v1/chat/generate-image', {
      prompt: '将这张图片转换为动漫风格',
      refImg: 'https://example.com/reference.jpg',
      refMode: 'refonly',  // 仅参考风格
      enableInterleave: true,  // 启用图文混排
      size: '1024*1024',
      model: 'wanx-v1'
    }, {
      withCredentials: true
    });

    console.log('生成的图片 URL:', response.data.url);
    return response.data;
  } catch (error) {
    console.error('图片生成失败:', error.response?.data?.message);
  }
}
```

## 配置说明

### 环境变量配置

在 `.env` 文件中配置默认 API Key（可选）：

```env
DEFAULT_API_KEY=your_aliyun_api_key_here
```

### 用户自定义配置

用户可以在个人设置中配置自己的阿里云 API Key，优先级高于环境变量：

1. 在数据库 `ModelConfig` 表中为用户设置 `apiKey` 字段
2. 系统会优先使用用户配置的 API Key
3. 如果用户未配置，则使用 `DEFAULT_API_KEY` 环境变量

## 实际发送到阿里云的请求格式

### 模式 1：纯文本生成图片（enableInterleave: false）

当没有参考图片时，使用纯文本模式：

```json
{
  "model": "wanx-v1",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": "一只可爱的小猫在花园里玩耍"
      }
    ]
  },
  "parameters": {
    "size": "1024*1024",
    "n": 1,
    "enable_interleave": false,
    "prompt_extend": true,
    "watermark": false
  }
}
```

### 模式 2：图文混排模式（enableInterleave: true）

当提供参考图片时，content 变成数组，包含文本和图片：

```json
{
  "model": "wanx-v1",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "text": "将这张图片转换为动漫风格"
          },
          {
            "image": "https://example.com/reference.jpg"
          }
        ]
      }
    ]
  },
  "parameters": {
    "size": "1024*1024",
    "n": 1,
    "enable_interleave": true,
    "ref_mode": "refonly"
  }
}
```

**关键区别**：
- **纯文本模式**：`content` 是字符串，`enable_interleave: false`
- **图文混排模式**：`content` 是数组（包含文本和图片对象），`enable_interleave: true`

## 注意事项

1. **API Key 配置**: 必须配置阿里云 API Key（用户配置或环境变量）
2. **异步处理**: 图片生成可能需要一定时间，系统会自动轮询查询结果（最长 60 秒）
3. **图片尺寸**: 支持三种尺寸：`1024*1024`（正方形）、`720*1280`（竖版）、`1280*720`（横版）
4. **图文混排**:
   - 使用参考图片时，只能选择 `refImg` 或 `refImgBase64` 之一
   - **重要**：当 `enableInterleave: false` 时，不能在请求中包含图片，否则会报错
   - 后端会自动判断：如果有参考图片，自动启用图文混排模式
5. **并发限制**: 建议控制并发请求数量，避免超出 API 限流
6. **请求格式**: 后端自动转换为阿里云要求的 `input.messages` 格式，前端只需按照 DTO 格式传参即可
7. **提示词扩展**:
   - `promptExtend: true` 会让 AI 自动优化和扩展你的提示词
   - 建议在简单描述时开启，详细描述时关闭

## 故障排查

### 问题 1: 返回 "未配置阿里云 API Key"

**解决方案**:
- 检查 `.env` 文件中是否配置了 `DEFAULT_API_KEY`
- 或者在数据库中为用户配置 `ModelConfig.apiKey`

### 问题 2: 返回 "图片生成超时"

**解决方案**:
- 检查网络连接是否正常
- 阿里云服务可能繁忙，稍后重试
- 尝试简化提示词

### 问题 3: 返回 401 认证失败

**解决方案**:
- 检查阿里云 API Key 是否有效
- 确认 API Key 有图片生成权限

### 问题 4: "When 'enable_interleave' is False, the last message must contain 1 to 4 images"

**原因**: 当 `enableInterleave` 为 false 时，messages 中不应该包含图片

**解决方案**:
- 如果不需要参考图片，不要传 `refImg` 或 `refImgBase64` 参数
- 如果需要使用参考图片，确保传了 `enableInterleave: true`（或者后端会自动设置）
- 纯文本生成图片时，不要传 `enableInterleave: true`

### 问题 5: "Field required: input.messages"

**原因**: 请求格式不符合阿里云 API 规范

**解决方案**:
- 这个错误已经在最新版本中修复
- 确保使用的是更新后的代码

## Swagger 文档

启动服务后访问: `http://localhost:3000/api` 查看完整 API 文档
