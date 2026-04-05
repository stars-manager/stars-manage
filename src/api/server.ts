// 后端服务 API 调用
// 开发环境通过 Vite 代理访问，生产环境使用相对路径
import { serverApiClient } from '../services/apiClient';

// 自定义 API 错误类
class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// 项目信息（用于标签生成）
export interface ProjectInfoForTags {
  name: string;
  full_name?: string;
  description?: string;
  language?: string;
  url?: string;
  stars?: number;
  forks?: number;
  topics?: string[];
}

// 标签生成请求
export interface StarsTagsRequest {
  projects: ProjectInfoForTags[];
}

// 项目标签信息
export interface ProjectTags {
  name: string;
  summary: string;
  tags: string[];
}

// 标签生成响应
export interface StarsTagsResponse {
  code: number;
  message: string;
  data: {
    projects: ProjectTags[];
    project_count: number;
    process_time: number;
  };
}

// 对话请求
export interface ChatRequest {
  message: string;
  session_id: string;
  documents?: string[];
}

// 对话响应
export interface ChatResponse {
  reply: string;
  session_id: string;
  is_new_session: boolean;
  has_documents: boolean;
  message_count: number;
  process_time: string;
}

// 为项目生成标签（使用 ApiClient）
export async function generateStarsTags(request: StarsTagsRequest): Promise<StarsTagsResponse> {
  try {
    return await serverApiClient.post<StarsTagsResponse>('/api/v1/stars/tags', request);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw new Error(error.message, { cause: error });
    }
    throw error;
  }
}

// 智能对话（使用 ApiClient）
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  try {
    return await serverApiClient.post<ChatResponse>('/api/v1/chat/message', request);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw new Error(error.message, { cause: error });
    }
    throw error;
  }
}

// 清除会话（使用 ApiClient）
export async function clearChatSession(sessionId: string): Promise<void> {
  try {
    await serverApiClient.delete(`/api/v1/chat/session/${sessionId}`);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw new Error(error.message, { cause: error });
    }
    throw error;
  }
}
