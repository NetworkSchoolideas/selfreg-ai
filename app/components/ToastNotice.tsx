"use client";

interface ToastNoticeProps {
  isVisible: boolean;
  message: string;
  tone?: "success" | "info" | "error";
  onDismiss: () => void;
}

export function ToastNotice({ isVisible, message, tone = "info", onDismiss }: ToastNoticeProps) {
  if (!isVisible) {
    return null;
  }

  const styles =
    tone === "success"
      ? { background: "#ecfdf5", border: "#86efac", color: "#166534" }
      : tone === "error"
        ? { background: "#fef2f2", border: "#fca5a5", color: "#991b1b" }
        : { background: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" };

  return (
    <div
      style={{
        position: "sticky",
        top: 12,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          minWidth: 280,
          maxWidth: 560,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 10,
          border: `1px solid ${styles.border}`,
          background: styles.background,
          color: styles.color,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <span className="fs-13 fw-500">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="button secondary"
          style={{ padding: "3px 8px", fontSize: 12, minHeight: 28 }}
          aria-label="Dismiss notification"
        >
          x
        </button>
      </div>
    </div>
  );
}
