"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Application error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <h3>Something went wrong</h3>
          <p style={{ color: "#666" }}>
            An unexpected error occurred. Please refresh the page or try again later.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="button"
            style={{ marginTop: 12 }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
