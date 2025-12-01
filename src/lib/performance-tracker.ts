import { PerformanceMetrics } from './types/logging';

export class PerformanceTracker {
  private startTime: number;
  private startCpuUsage?: NodeJS.CpuUsage;
  private startMemoryUsage?: NodeJS.MemoryUsage;

  constructor() {
    this.startTime = Date.now();
    
    // Capture initial CPU and memory usage if available
    if (typeof process !== 'undefined') {
      this.startCpuUsage = process.cpuUsage();
      this.startMemoryUsage = process.memoryUsage();
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    const duration = Date.now() - this.startTime;
    const metrics: PerformanceMetrics = { duration };

    if (typeof process !== 'undefined') {
      // Calculate CPU usage difference
      if (this.startCpuUsage) {
        metrics.cpuUsage = process.cpuUsage(this.startCpuUsage);
      }

      // Get current memory usage
      metrics.memoryUsage = process.memoryUsage();
    }

    return metrics;
  }

  /**
   * Get duration in milliseconds
   */
  public getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Check if operation is taking too long
   */
  public isSlowOperation(thresholdMs: number = 1000): boolean {
    return this.getDuration() > thresholdMs;
  }

  /**
   * Get memory usage delta if available
   */
  public getMemoryDelta(): Partial<NodeJS.MemoryUsage> | undefined {
    if (typeof process === 'undefined' || !this.startMemoryUsage) {
      return undefined;
    }

    const currentMemory = process.memoryUsage();
    return {
      rss: currentMemory.rss - this.startMemoryUsage.rss,
      heapTotal: currentMemory.heapTotal - this.startMemoryUsage.heapTotal,
      heapUsed: currentMemory.heapUsed - this.startMemoryUsage.heapUsed,
      external: currentMemory.external - this.startMemoryUsage.external,
      arrayBuffers: currentMemory.arrayBuffers - this.startMemoryUsage.arrayBuffers,
    };
  }

  /**
   * Format metrics for logging
   */
  public formatMetrics(): Record<string, any> {
    const metrics = this.getMetrics();
    const formatted: Record<string, any> = {
      duration: `${metrics.duration}ms`,
    };

    if (metrics.cpuUsage) {
      formatted.cpuUser = `${(metrics.cpuUsage.user / 1000).toFixed(2)}ms`;
      formatted.cpuSystem = `${(metrics.cpuUsage.system / 1000).toFixed(2)}ms`;
    }

    if (metrics.memoryUsage) {
      formatted.memoryRSS = `${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`;
      formatted.memoryHeap = `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`;
    }

    const memoryDelta = this.getMemoryDelta();
    if (memoryDelta) {
      formatted.memoryDelta = `${(memoryDelta.heapUsed! / 1024 / 1024).toFixed(2)}MB`;
    }

    return formatted;
  }

  /**
   * Create a performance tracker and return a function to get metrics
   */
  static track(): () => PerformanceMetrics {
    const tracker = new PerformanceTracker();
    return () => tracker.getMetrics();
  }

  /**
   * Measure the performance of an async function
   */
  static async measure<T>(
    fn: () => Promise<T>,
    onComplete?: (metrics: PerformanceMetrics, result: T) => void
  ): Promise<T> {
    const tracker = new PerformanceTracker();
    
    try {
      const result = await fn();
      const metrics = tracker.getMetrics();
      
      if (onComplete) {
        onComplete(metrics, result);
      }
      
      return result;
    } catch (error) {
      const metrics = tracker.getMetrics();
      
      if (onComplete) {
        onComplete(metrics, error as T);
      }
      
      throw error;
    }
  }

  /**
   * Create a performance monitoring decorator for functions
   */
  static monitor<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    name?: string
  ) {
    return async (...args: T): Promise<R> => {
      const tracker = new PerformanceTracker();
      const functionName = name || fn.name || 'anonymous';
      
      try {
        const result = await fn(...args);
        const metrics = tracker.getMetrics();
        
        // Log performance if it's slow
        if (tracker.isSlowOperation()) {
          console.warn(`Slow operation detected: ${functionName}`, tracker.formatMetrics());
        }
        
        return result;
      } catch (error) {
        const metrics = tracker.getMetrics();
        console.error(`Error in ${functionName} after ${metrics.duration}ms:`, error);
        throw error;
      }
    };
  }
}
