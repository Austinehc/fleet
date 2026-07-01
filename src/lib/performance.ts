/**
 * Performance optimization utilities with React hooks
 * Enhanced with memory leak prevention and better resource management
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { UI_CONSTANTS } from './constants';

// Type definitions for browser performance API
interface PerformanceMemory {
  readonly jsHeapSizeLimit: number;
  readonly totalJSHeapSize: number;
  readonly usedJSHeapSize: number;
}

interface PerformanceWithMemory extends Performance {
  readonly memory?: PerformanceMemory;
}

// Memoization helper for expensive calculations
export function useMemoizedCalculation<T>(
  calculation: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(calculation, dependencies);
}

// Debounced callback hook with cleanup
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = UI_CONSTANTS.DEBOUNCE_DELAY
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    }) as T,
    [delay]
  );
}

// Throttled callback hook with cleanup
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = UI_CONSTANTS.THROTTLE_DELAY
): T {
  const callbackRef = useRef(callback);
  const lastCallRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;
      
      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      } else {
        // Schedule next call
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callbackRef.current(...args);
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [delay]
  );
}

// Smart polling hook with exponential backoff and resource management
export function useOptimizedPolling(
  pollFunction: () => Promise<void>,
  baseInterval: number = 30000, // Increased from 5000 to 30000 (30s)
  options: {
    maxInterval?: number;
    backoffMultiplier?: number;
    maxRetries?: number;
    enableVisibilityOptimization?: boolean;
  } = {}
): { 
  isPolling: boolean; 
  forceRefresh: () => void; 
  stopPolling: () => void; 
  startPolling: () => void;
  currentInterval: number;
  errorCount: number;
} {
  const {
    maxInterval = 300000, // 5 minutes max
    backoffMultiplier = 1.5,
    maxRetries = 5,
    enableVisibilityOptimization = true
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(baseInterval);
  const [errorCount, setErrorCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollRef = useRef(0);
  const isActiveRef = useRef(true);
  const retryCountRef = useRef(0);

  // Handle page visibility to pause polling when tab is inactive
  useEffect(() => {
    if (!enableVisibilityOptimization) return;

    const handleVisibilityChange = () => {
      const wasActive = isActiveRef.current;
      isActiveRef.current = !document.hidden;
      
      if (document.hidden && wasActive) {
        // Tab became hidden - stop polling to save resources
        stopPolling();
      } else if (!document.hidden && !wasActive) {
        // Tab became visible - resume polling
        const timeSinceLastPoll = Date.now() - lastPollRef.current;
        if (timeSinceLastPoll > currentInterval) {
          forceRefresh();
        }
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentInterval, enableVisibilityOptimization]);

  const startPolling = useCallback(() => {
    if (!isActiveRef.current || intervalRef.current) return;

    setIsPolling(true);
    
    const scheduleNext = (interval: number) => {
      intervalRef.current = setTimeout(async () => {
        if (!isActiveRef.current) {
          stopPolling();
          return;
        }

        try {
          await pollFunction();
          lastPollRef.current = Date.now();
          
          // Reset error count and interval on success
          if (retryCountRef.current > 0) {
            retryCountRef.current = 0;
            setErrorCount(0);
            setCurrentInterval(baseInterval);
            scheduleNext(baseInterval);
          } else {
            scheduleNext(interval);
          }
        } catch (error) {
          console.error('Polling error:', error);
          retryCountRef.current++;
          setErrorCount(retryCountRef.current);

          if (retryCountRef.current >= maxRetries) {
            // Stop polling after max retries
            stopPolling();
            console.warn(`Polling stopped after ${maxRetries} consecutive failures`);
            return;
          }

          // Exponential backoff
          const nextInterval = Math.min(
            interval * backoffMultiplier,
            maxInterval
          );
          setCurrentInterval(nextInterval);
          scheduleNext(nextInterval);
        }
      }, interval);
    };

    scheduleNext(currentInterval);
  }, [pollFunction, currentInterval, baseInterval, maxInterval, backoffMultiplier, maxRetries]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const forceRefresh = useCallback(async () => {
    try {
      await pollFunction();
      lastPollRef.current = Date.now();
      
      // Reset error state on successful manual refresh
      retryCountRef.current = 0;
      setErrorCount(0);
      setCurrentInterval(baseInterval);
    } catch (error) {
      console.error('Force refresh error:', error);
      retryCountRef.current++;
      setErrorCount(retryCountRef.current);
    }
  }, [pollFunction, baseInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return { 
    isPolling, 
    forceRefresh, 
    stopPolling, 
    startPolling,
    currentInterval,
    errorCount
  };
}

// Intersection observer hook for lazy loading with cleanup
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Cleanup existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsIntersecting(entry.isIntersecting);
        }
      },
      options
    );

    observerRef.current.observe(element);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, options]);

  return isIntersecting;
}

// Virtual list hook for large datasets with memory optimization
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = useMemo(() => {
    return Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  }, [scrollTop, itemHeight, overscan]);

  const endIndex = useMemo(() => {
    return Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  const offsetY = useMemo(() => {
    return startIndex * itemHeight;
  }, [startIndex, itemHeight]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop,
  };
}

// Image lazy loading with placeholder and error handling
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Cancel previous image loading
    if (imageRef.current) {
      imageRef.current.onload = null;
      imageRef.current.onerror = null;
    }

    const img = new Image();
    imageRef.current = img;
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };
    
    img.src = src;

    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [src]);

  return { imageSrc, isLoading, hasError };
}

// Enhanced performance monitoring with memory management
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private maxMetricsPerLabel = 50; // Reduced from 100 to prevent memory bloat

  startTiming(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const values = this.metrics.get(label)!;
    values.push(value);
    
    // Keep only recent measurements to prevent memory leaks
    if (values.length > this.maxMetricsPerLabel) {
      values.splice(0, values.length - this.maxMetricsPerLabel);
    }
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number; p95: number } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = sorted[0] || 0;
    const max = sorted[sorted.length - 1] || 0;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || 0;

    return { avg, min, max, count: values.length, p95 };
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number; p95: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number; p95: number }> = {};
    
    for (const [label] of this.metrics) {
      const metrics = this.getMetrics(label);
      if (metrics) {
        result[label] = metrics;
      }
    }
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  // Get memory usage statistics
  getMemoryStats(): PerformanceMemory | null {
    if ('memory' in performance) {
      return (performance as PerformanceWithMemory).memory || null;
    }
    return null;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Memoized component wrapper
export function memo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.ComponentType<P> {
  return React.memo(Component, propsAreEqual);
}

// Hook for expensive calculations with dependency tracking and timeout
export function useExpensiveCalculation<T>(
  calculateFn: () => T,
  dependencies: React.DependencyList,
  label?: string,
  timeout: number = 5000 // 5 second timeout
): T {
  return useMemo(() => {
    const endTiming = label ? performanceMonitor.startTiming(label) : undefined;
    
    // Wrap calculation in timeout for performance monitoring
    const startTime = Date.now();
    const result = calculateFn();
    const duration = Date.now() - startTime;
    
    if (duration > timeout && label) {
      console.warn(`Expensive calculation "${label}" took ${duration}ms (timeout: ${timeout}ms)`);
    }
    
    endTiming?.();
    return result;
  }, dependencies);
}

// Hook for managing component render performance
export function useRenderMonitoring(componentName: string) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(Date.now());
  
  useEffect(() => {
    renderCountRef.current++;
    
    // Log excessive re-renders
    if (renderCountRef.current > 50) {
      console.warn(`Component "${componentName}" has rendered ${renderCountRef.current} times since mount`);
    }
  });

  useEffect(() => {
    const mountTime = Date.now() - mountTimeRef.current;
    performanceMonitor.recordMetric(`${componentName}_mount_time`, mountTime);
    
    return () => {
      const totalLifetime = Date.now() - mountTimeRef.current;
      performanceMonitor.recordMetric(`${componentName}_lifetime`, totalLifetime);
      performanceMonitor.recordMetric(`${componentName}_total_renders`, renderCountRef.current);
    };
  }, [componentName]);

  return {
    renderCount: renderCountRef.current,
    mountTime: mountTimeRef.current,
  };
}

// Cleanup performance monitoring on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.clearMetrics();
  });
}