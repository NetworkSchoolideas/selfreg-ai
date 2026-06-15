"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  lang?: "ru" | "en";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

const FALLBACK_TEXT: Record<"ru" | "en", { title: string; message: string; button: string }> = {
  ru: {
    title: "Что-то пошло не так",
    message: "Произошла непредвиденная ошибка. Пожалуйста, обновите страницу или попробуйте позже.",
    button: "Обновить страницу",
  },
  en: {
    title: "Something went wrong",
    message: "An unexpected error occurred. Please refresh the page or try again later.",
    button: "Reload page",
  },
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Application error caught:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const lang = this.props.lang ?? "ru";
      const text = FALLBACK_TEXT[lang];

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 32,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{text.title}</h2>
            <p style={{ margin: "0 0 24px", color: "#666", fontSize: 14, lineHeight: 1.5 }}>
              {text.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="button"
              style={{ marginTop: 0 }}
            >
              {text.button}
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details style={{ marginTop: 24, textAlign: "left" }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "#999" }}>
                  Error details (dev only)
                </summary>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: "#f5f5f5",
                    borderRadius: 8,
                    fontSize: 11,
                    overflow: "auto",
                    maxHeight: 200,
                    color: "#c00",
                  }}
                >
                  {this.state.error.name}: {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
