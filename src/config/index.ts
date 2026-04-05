/**
 * 应用配置管理
 * 
 * 集中管理所有配置项，包括：
 * - API 端点
 * - 超时时间
 * - 错误提示信息
 * - 功能开关
 */

// API 配置
export const API_CONFIG = {
  // 后端服务地址
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  
  // 请求超时时间（毫秒）
  timeout: 30000,
  
  // 重试次数
  retries: 3,
  
  // 重试延迟（毫秒）
  retryDelay: 1000,
  
  // API 端点
  endpoints: {
    generateTags: '/api/v1/stars/tags',
    chat: '/api/v1/chat/message',
    clearSession: (sessionId: string) => `/api/v1/chat/session/${sessionId}`,
  },
} as const;

// UI 配置
export const UI_CONFIG = {
  // 虚拟滚动配置
  virtualList: {
    height: 800,
    itemHeight: 200,
  },
  
  // AutoTagger 配置
  autoTagger: {
    batchSize: 20, // 后端限制每批最多 20 个项目
    maxProjects: 20, // 一次最多处理的项目数
  },
  
  // 对话框配置
  dialog: {
    smartMatcher: {
      width: '700px',
      maxHeight: '600px',
    },
    autoTagger: {
      width: '800px',
    },
  },
  
  // 分页配置
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
} as const;

// 错误消息配置
export const ERROR_MESSAGES = {
  // API 错误
  api: {
    networkError: '网络请求失败，请检查网络连接',
    timeout: '请求超时，请稍后重试',
    serverError: '服务器错误，请稍后重试',
    unauthorized: '未授权，请重新登录',
  },
  
  // SmartMatcher 错误
  smartMatcher: {
    emptyQuery: '请输入查询内容',
    noProjects: '暂无项目数据',
    matchFailed: '智能匹配失败，请确保后端服务正在运行',
    noMatch: '未找到匹配的项目',
    backendUnavailable: '无法连接到后端服务，请确保后端服务正在运行（http://localhost:8080）',
  },
  
  // AutoTagger 错误
  autoTagger: {
    noSelection: '请先选择要生成标签的项目',
    generationFailed: '标签生成失败',
    applyFailed: '应用标签失败',
    noProjectsToApply: '请至少选择一个项目',
    allTagged: '所有项目都已设置标签，无需生成',
  },
  
  // 标签错误
  label: {
    nameRequired: '标签名称不能为空',
    nameTooLong: '标签名称过长',
    duplicateName: '标签名称已存在',
  },
  
  // 同步错误
  sync: {
    notAuthenticated: '请先登录',
    noSyncRepo: '请先选择同步仓库',
    noData: '暂无 Stars 数据可同步',
    pushFailed: '推送失败，请检查网络或登录状态',
  },
} as const;

// 成功消息配置
export const SUCCESS_MESSAGES = {
  // AutoTagger 成功
  autoTagger: {
    tagsApplied: (count: number) => `已为 ${count} 个项目应用标签`,
    foundMatches: (count: number) => `找到 ${count} 个相关项目`,
  },
  
  // 标签成功
  label: {
    created: '标签创建成功',
    updated: '标签更新成功',
    deleted: '标签删除成功',
  },
  
  // 同步成功
  sync: {
    completed: '同步完成',
    dataMerged: (added: number, updated: number) => 
      `数据合并完成：新增 ${added} 个项目，更新 ${updated} 个项目`,
  },
} as const;

// 功能开关配置
export const FEATURE_FLAGS = {
  // 是否启用自动标签生成功能
  enableAutoTagger: true,
  
  // 是否启用智能匹配功能
  enableSmartMatcher: true,
  
  // 是否启用批量操作
  enableBatchOperations: true,
  
  // 是否启用虚拟滚动
  enableVirtualScroll: true,
  
  // 是否启用高级筛选
  enableAdvancedFilter: true,
} as const;

// 日志配置
export const LOG_CONFIG = {
  // 是否启用日志
  enabled: import.meta.env.DEV,
  
  // 日志级别
  level: import.meta.env.DEV ? 'debug' : 'error',
  
  // 是否在控制台输出
  console: import.meta.env.DEV,
} as const;

// 类型导出
export type ApiConfig = typeof API_CONFIG;
export type UiConfig = typeof UI_CONFIG;
export type ErrorMessages = typeof ERROR_MESSAGES;
export type SuccessMessages = typeof SUCCESS_MESSAGES;
export type FeatureFlags = typeof FEATURE_FLAGS;
export type LogConfig = typeof LOG_CONFIG;
