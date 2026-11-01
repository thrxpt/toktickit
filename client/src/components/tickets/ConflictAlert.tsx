import { useEffect, useRef } from "react";

interface ConflictAlertProps {
  onReload: () => void;
  onDismiss: () => void;
}

export default function ConflictAlert({ onReload, onDismiss }: ConflictAlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // AC-20: announce the conflict without moving focus out of an editor.
    if (!document.activeElement?.matches("input, textarea, select, [contenteditable=true]")) {
      alertRef.current?.focus();
    }
  }, []);

  return (
    <div ref={alertRef} role="alert" tabIndex={-1} className="alert alert-danger zen-conflict-alert mb-3">
      <p>Someone else updated this Ticket while you were editing. Your text has been kept. Reload to see the latest version before saving again.</p>
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={onReload}>Reload ticket</button>
        <button type="button" className="btn btn-outline-secondary" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
