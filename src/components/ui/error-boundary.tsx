"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface rounded-2xl border border-error/20 ring-1 ring-error/10 p-6 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-xl">
              error
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {this.props.fallbackMessage ?? "Something went wrong"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="h-8 px-4 rounded-lg bg-surface-container-high text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
