/**
 * 统一 API 客户端
 * 
 * 功能：
 * - 请求超时控制
 * - 自动重试机制
 * - 统一错误处理
 * - 请求/响应拦截器
 */

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.details = details;
  }
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(baseUrl: string = '', config?: RequestConfig) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = config?.timeout || 30000; // 30 秒
    this.maxRetries = config?.retries || 3; // 最多重试 3 次
    this.retryDelay = config?.retryDelay || 1000; // 重试延迟 1 秒
  }

  /**
   * 统一请求方法
   */
  async request<T>(endpoint: string, options: RequestInit & RequestConfig = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries ?? this.maxRetries;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await this.parseErrorResponse(response);
          throw new ApiClientError(error.code, error.message, error.details);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是取消请求，不重试
        if ((error as Error).name === 'AbortError') {
          throw new ApiClientError('TIMEOUT', '请求超时');
        }

        // 如果是最后一次尝试，抛出错误
        if (attempt === retries) {
          break;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }

    throw lastError || new ApiClientError('UNKNOWN_ERROR', '未知错误');
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT 请求
   */
  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * 解析错误响应
   */
  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const text = await response.text();
      if (!text) {
        return {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      return JSON.parse(text) as ApiError;
    } catch {
      return {
        code: 'PARSE_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }
}

// 创建默认实例
export const apiClient = new ApiClient();

// 创建服务端 API 客户端实例
export const serverApiClient = new ApiClient('/api', {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
});
