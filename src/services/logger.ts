/**
 * 前端结构化日志系统
 * 
 * 功能：
 * - 结构化日志输出
 * - 日志级别控制
 * - 错误追踪
 * - 性能监控
 */

import { LOG_CONFIG } from '../config';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private enabled: boolean;
  private level: LogLevel;
  private console: boolean;

  constructor() {
    this.enabled = LOG_CONFIG.enabled;
    this.level = LogLevel[LOG_CONFIG.level.toUpperCase() as keyof typeof LogLevel] || LogLevel.ERROR;
    this.console = LOG_CONFIG.console;
  }

  /**
   * 格式化日志条目
   */
  private formatEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.context ? `[${entry.context}]` : '',
      entry.message,
    ].filter(Boolean);

    let output = parts.join(' ');

    if (entry.data) {
      output += ` | ${JSON.stringify(entry.data)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return output;
  }

  /**
   * 输出日志
   */
  private log(entry: LogEntry): void {
    if (!this.enabled) return;

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level);
    const entryLevelIndex = levels.indexOf(entry.level);

    if (entryLevelIndex < currentLevelIndex) return;

    if (this.console) {
      const formatted = this.formatEntry(entry);
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
          console.error(formatted);
          break;
      }
    }
  }

  /**
   * 获取当前时间戳
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 调试日志
   */
  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log({
      timestamp: this.getTimestamp(),
      level: LogLevel.DEBUG,
      message,
      context,
      data,
    });
  }

  /**
   * 信息日志
   */
  info(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log({
      timestamp: this.getTimestamp(),
      level: LogLevel.INFO,
      message,
      context,
      data,
    });
  }

  /**
   * 警告日志
   */
  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log({
      timestamp: this.getTimestamp(),
      level: LogLevel.WARN,
      message,
      context,
      data,
    });
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error, context?: string, data?: Record<string, unknown>): void {
    this.log({
      timestamp: this.getTimestamp(),
      level: LogLevel.ERROR,
      message,
      context,
      data,
      error,
    });
  }

  /**
   * 性能计时器
   */
  time(label: string, context?: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.debug(`${label} completed in ${duration.toFixed(2)}ms`, context, { duration });
    };
  }

  /**
   * 分组日志
   */
  group(label: string): void {
    if (this.enabled && this.console) {
      console.group(label);
    }
  }

  /**
   * 结束分组日志
   */
  groupEnd(): void {
    if (this.enabled && this.console) {
      console.groupEnd();
    }
  }

  /**
   * 表格日志
   */
  table(data: Record<string, unknown>[]): void {
    if (this.enabled && this.console) {
      console.table(data);
    }
  }
}

// 导出单例实例
export const logger = new Logger();

// 便捷方法
export const log = {
  debug: (message: string, context?: string, data?: Record<string, unknown>) =>
    logger.debug(message, context, data),
  info: (message: string, context?: string, data?: Record<string, unknown>) =>
    logger.info(message, context, data),
  warn: (message: string, context?: string, data?: Record<string, unknown>) =>
    logger.warn(message, context, data),
  error: (message: string, error?: Error, context?: string, data?: Record<string, unknown>) =>
    logger.error(message, error, context, data),
  time: (label: string, context?: string) => logger.time(label, context),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
  table: (data: Record<string, unknown>[]) => logger.table(data),
};
