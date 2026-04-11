/**
 * Tool Calling 类型定义
 * AI 输出的结构化指令，前端解析执行
 */

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  id?: string;
}

export interface ToolResult {
  toolCallId?: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// Tool 参数类型
export interface UpdateColorsArgs {
  colors: Record<string, string>;
}

export interface AnalyzeImageArgs {
  imageUrl: string;
  fileName?: string;
}

export interface ParsePenArgs {
  penContent: string;
  fileName?: string;
}

export interface GenerateBackgroundArgs {
  prompt: string;
}

export interface UploadBackgroundArgs {
  imageUrl: string;
}

export interface ScreenshotArgs {
  components: string[];
}

export interface BuildArgs {
  configYaml?: string;
}

export interface VerifyArgs {
  zipDir: string;
}

export interface SaveColorsArgs {
  colors: Record<string, string>;
  nameEn: string;
  name: string;
  templateType: string;
}

export interface LoadColorsArgs {
  nameEn: string;
}

// Chat 消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'image' | 'pen' | 'other';
  name: string;
  url: string;
  data?: string; // base64 for images
}

// AI 请求/响应类型
export interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | ContentPart[];
  }>;
  tools?: ToolDefinition[];
  temperature?: number;
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}

// 设置类型
export interface AISettings {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  imageApiEndpoint?: string;
  imageApiKey?: string;
  imageModel?: string;
}
