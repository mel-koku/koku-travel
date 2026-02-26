"use client";

import React, { Component, type ReactNode } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/Button";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * React Error Boundary component for catching and handling component tree errors
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 * 
 * Or with custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error using centralized logger
    logger.error("Error boundary caught error", error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 p-8">
          <div className="text-center">
            <h2 className="mb-2 font-serif text-xl italic text-destructive">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-destructive/80">
              An error occurred while rendering this component.
            </p>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <div className="mb-4 rounded border border-destructive/30 bg-destructive/15 p-3 text-left">
                <p className="text-xs font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="primary" size="sm">
                Try again
              </Button>
              <Button asChild href="/" variant="secondary" size="sm">
                Go home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
