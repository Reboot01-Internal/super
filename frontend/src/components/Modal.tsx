import React from "react";

export default function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onMouseDown={onClose}
    >
      <div
        className="glass"
        style={{
          width: "min(720px, 100%)",
          borderRadius: 18,
          padding: 16,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ height: 12 }} />
        {children}

        {footer && (
          <>
            <div style={{ height: 14 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {footer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}