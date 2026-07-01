/**
 * Centralized error handling utilities
 */

import { ERROR_MESSAGES } from './constants';

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown> | undefined;
  timestamp: number;
  stack: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export class FleetError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: number;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    severity: ErrorSeverity = 'medium',
    details?: Record<string, unknown> | undefined
  ) {
    super(message);
    this.name = 'FleetError';
    this.code = code;
    this.severity = severity;
    this.timestamp = Date.now();
    this.details = details;
  }
}

class ErrorHandler {
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  // Log error with consistent format
  logError(error: Error | FleetError, context?: string): void {
    const appError: AppError = {
      code: error instanceof FleetError ? error.code : 'UNKNOWN_ERROR',
      message: error.message,
      details: error instanceof FleetError ? error.details : (context ? { context } : undefined),
      timestamp: Date.now(),
      stack: error.stack || '',
    };

    // Add to log
    this.errorLog.unshift(appError);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console log for development
    console.error('Fleet Error:', appError);

    // In production, you would send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(appError);
    }
  }

  // Get user-friendly error message
  getUserMessage(error: Error | FleetError): string {
    if (error instanceof FleetError) {
      return error.message;
    }

    // Map common errors to user-friendly messages
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return ERROR_MESSAGES.ACCESS_DENIED;
    }

    if (error.message.includes('not found') || error.message.includes('404')) {
      return ERROR_MESSAGES.NOT_FOUND;
    }

    return ERROR_MESSAGES.OPERATION_FAILED;
  }

  // Handle async operations with error wrapping
  async handleAsync<T>(
    operation: () => Promise<T>,
    errorContext: string = 'Unknown operation'
  ): Promise<{ data?: T; error?: FleetError }> {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const fleetError = new FleetError(
        this.getUserMessage(error as Error),
        'ASYNC_OPERATION_FAILED',
        'medium',
        { context: errorContext, originalError: error }
      );
      
      this.logError(fleetError, errorContext);
      return { error: fleetError };
    }
  }

  // Handle sync operations with error wrapping
  handleSync<T>(
    operation: () => T,
    errorContext: string = 'Unknown operation'
  ): { data?: T; error?: FleetError } {
    try {
      const data = operation();
      return { data };
    } catch (error) {
      const fleetError = new FleetError(
        this.getUserMessage(error as Error),
        'SYNC_OPERATION_FAILED',
        'medium',
        { context: errorContext, originalError: error }
      );
      
      this.logError(fleetError, errorContext);
      return { error: fleetError };
    }
  }

  // Retry mechanism for failed operations
  async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
    context: string = 'Retry operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          this.logError(lastError, `${context} - Final attempt ${attempt} failed`);
          throw new FleetError(
            this.getUserMessage(lastError),
            'RETRY_EXHAUSTED',
            'high',
            { attempts: maxAttempts, context }
          );
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError!;
  }

  // Get recent errors for debugging
  getRecentErrors(limit: number = 10): AppError[] {
    return this.errorLog.slice(0, limit);
  }

  // Clear error log
  clearErrors(): void {
    this.errorLog = [];
  }

  // Send to error tracking service (placeholder)
  private sendToErrorService(error: AppError): void {
    // In production, integrate with services like Sentry, LogRocket, etc.
    // For now, we'll just store locally
    try {
      const errorData = JSON.stringify(error);
      localStorage.setItem(`fleet_error_${error.timestamp}`, errorData);
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }
}

export const errorHandler = new ErrorHandler();