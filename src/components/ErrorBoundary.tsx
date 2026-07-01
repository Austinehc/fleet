/**
 * React Error Boundary Components
 * Fixes architectural issue: Missing Error Boundaries
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { errorHandler, FleetError } from '../lib/errorHandling';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'route' | 'component';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    // Create enhanced error with context
    const fleetError = new FleetError(
      `React Error Boundary (${level}): ${error.message}`,
      'REACT_ERROR_BOUNDARY',
      level === 'app' ? 'critical' : 'high',
      {
        level,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
        retryCount: this.retryCount,
      }
    );

    // Log error
    errorHandler.logError(fleetError, `Error Boundary - ${level}`);

    // Call custom error handler
    onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.retryCount++;
    
    if (this.retryCount > this.maxRetries) {
      // Too many retries, redirect to safe state
      this.handleReload();
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallbackComponent: FallbackComponent, level = 'component' } = this.props;

      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} reset={this.handleReset} />;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          level={level}
          retryCount={this.retryCount}
          maxRetries={this.maxRetries}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorId: string | null;
  level: string;
  retryCount: number;
  maxRetries: number;
  onReset: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  level,
  retryCount,
  maxRetries,
  onReset,
  onReload,
  onGoHome,
}) => {
  const isAppLevel = level === 'app';
  const canRetry = retryCount < maxRetries;

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 ${
      isAppLevel ? 'fixed inset-0 z-50' : 'min-h-[400px]'
    }`}>
      <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-xl p-6 text-center space-y-6">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-gray-900">
            {isAppLevel ? 'Application Error' : 'Component Error'}
          </h1>
          <p className="text-sm text-gray-600">
            {isAppLevel 
              ? 'The application encountered an unexpected error and needs to recover.'
              : 'This section encountered an error but the rest of the application should still work.'
            }
          </p>
        </div>

        {/* Error Details (Development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="text-left bg-gray-50 border rounded-lg p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-700">Error Details:</div>
            <div className="text-xs text-red-600 font-mono break-words">
              {error.message}
            </div>
            {errorId && (
              <div className="text-xs text-gray-500">
                Error ID: {errorId}
              </div>
            )}
          </div>
        )}

        {/* Retry Information */}
        {retryCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs text-amber-700">
              Retry attempt {retryCount} of {maxRetries}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {canRetry && (
            <button
              onClick={onReset}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}

          <div className="flex gap-2">
            {isAppLevel ? (
              <button
                onClick={onReload}
                className="flex-1 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            ) : (
              <button
                onClick={onGoHome}
                className="flex-1 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            )}

            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => console.error('Error Details:', { error, errorId })}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Bug className="w-4 h-4" />
                Debug
              </button>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-xs text-gray-500">
          If this problem persists, please contact support with Error ID: {errorId}
        </div>
      </div>
    </div>
  );
};

// Specialized error boundaries for different contexts
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    level="app"
    onError={(error, errorInfo) => {
      // Additional app-level error handling
      console.error('App-level error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const RouteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    level="route"
    onError={(error, errorInfo) => {
      // Route-specific error handling
      console.error('Route-level error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    level="component"
    onError={(error, errorInfo) => {
      // Component-specific error handling
      console.error('Component-level error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting within components
export function useErrorHandler() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    const fleetError = new FleetError(
      error.message,
      'MANUAL_ERROR_REPORT',
      'medium',
      { context, originalError: error }
    );
    
    errorHandler.logError(fleetError, context || 'Manual Error Report');
  }, []);

  return { reportError };
}

export default ErrorBoundary;