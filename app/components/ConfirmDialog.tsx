"use client";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "neutral",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  const confirmStyles =
    tone === "danger"
      ? { background: "#dc2626", color: "white" }
      : { background: "var(--accent)", color: "white" };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <button onClick={onCancel} className="modal-close" aria-label={cancelLabel}>
          x
        </button>

        <h2 className="m-0 mb-10 fs-20">{title}</h2>
        <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>
          {message}
        </p>

        <div className="flex-row justify-end gap-8 mt-24">
          <button className="button secondary" onClick={onCancel} style={{ padding: "8px 14px" }}>
            {cancelLabel}
          </button>
          <button className="button" onClick={onConfirm} style={{ padding: "8px 14px", ...confirmStyles }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
