/**
 * 性能监控工具
 * 用于收集和分析前端性能指标
 */

// 性能指标接口
interface PerformanceMetrics {
  // 首次内容绘制 (First Contentful Paint)
  fcp: number;
  // 最大内容绘制 (Largest Contentful Paint)
  lcp: number;
  // 首次输入延迟 (First Input Delay)
  fid: number;
  // 累积布局偏移 (Cumulative Layout Shift)
  cls: number;
  // 交互时间 (Time to Interactive)
  tti: number;
}

// Performance Event Timing 接口
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

// Layout Shift Entry 接口
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// 性能监控类
class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};

  constructor() {
    this.init();
  }

  private init() {
    // 仅在浏览器环境运行
    if (typeof window === 'undefined') return;

    // 监听页面加载完成
    if (document.readyState === 'complete') {
      this.collectMetrics();
    } else {
      window.addEventListener('load', () => this.collectMetrics());
    }

    // 监听性能指标
    this.observePerformance();
  }

  // 收集性能指标
  private collectMetrics() {
    const timing = performance.timing;

    // 计算关键时间点
    this.metrics.tti = timing.domInteractive - timing.navigationStart;

    // 发送到监控平台（可选）
    this.sendToAnalytics(this.metrics);
  }

  // 观察 Web Vitals 指标
  private observePerformance() {
    // FCP (First Contentful Paint)
    this.observeEntry('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.metrics.fcp = entry.startTime;
      }
    });

    // LCP (Largest Contentful Paint)
    this.observeEntry('largest-contentful-paint', (entry) => {
      this.metrics.lcp = entry.startTime;
    });

    // FID (First Input Delay)
    this.observeEntry('first-input', (entry) => {
      const eventEntry = entry as PerformanceEventTiming;
      if (eventEntry.processingStart && eventEntry.startTime) {
        this.metrics.fid = eventEntry.processingStart - eventEntry.startTime;
      }
    });

    // CLS (Cumulative Layout Shift)
    this.observeCLS();
  }

  // 观察性能条目
  private observeEntry(
    entryType: string,
    callback: (entry: PerformanceEntry) => void
  ) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      observer.observe({ entryTypes: [entryType] });
    } catch {
      // 静默失败
    }
  }

  // 观察 CLS
  private observeCLS() {
    let clsValue = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as LayoutShiftEntry;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
        this.metrics.cls = clsValue;
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // 静默失败
    }
  }

  // 发送到分析平台
  private sendToAnalytics(metrics: Partial<PerformanceMetrics>) {
    // 仅在生产环境发送
    if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_MONITOR === 'true') {
      // 示例：发送到自定义监控平台
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          url: window.location.href,
          timestamp: Date.now(),
        }),
      }).catch(err => console.error('[Performance] Failed to send metrics:', err));
    }
  }

  // 获取当前性能指标
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  // 标记自定义性能点
  mark(name: string) {
    performance.mark(name);
  }

  // 测量两个标记之间的时间
  measure(name: string, startMark: string, endMark?: string) {
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const entries = performance.getEntriesByName(name, 'measure');
      const duration = entries[entries.length - 1]?.duration;

      console.log(`[Performance] ${name}: ${duration?.toFixed(2)}ms`);

      return duration;
    } catch (e) {
      console.warn(`[Performance] Failed to measure ${name}:`, e);
      return 0;
    }
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

// 使用示例：
// performanceMonitor.mark('data-fetch-start');
// await fetchData();
// performanceMonitor.mark('data-fetch-end');
// performanceMonitor.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
