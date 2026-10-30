import { Link } from "react-router-dom";
import type { ReactNode } from "react";
export function MetricCard({
  label,
  value,
  to,
  badge,
  loading,
  onRetry,
}: {
  label: string;
  value?: number;
  to?: string;
  badge?: ReactNode;
  loading?: boolean;
  onRetry?: () => void;
}) {
  const content = (
    <>
      <h3 className="small fw-semibold text-body-secondary mb-2">
        {badge || label}
      </h3>
      <p className={`fs-2 fw-bold mb-0 ${loading ? "placeholder-glow" : ""}`}>
        {loading ? (
          <span className="placeholder col-4" aria-hidden="true">
            0
          </span>
        ) : (
          (value ?? "Unavailable")
        )}
      </p>
      {onRetry && (
        <button
          className="btn btn-link text-start p-0 mt-2"
          onClick={onRetry}
          aria-label={`Retry ${label}`}
        >
          Retry
        </button>
      )}
    </>
  );
  return (
    <div className="col-12 col-md-6 col-lg-3">
      {to ? (
        <Link
          to={to}
          aria-label={`${label}, ${value}, view list`}
          className="card p-4 h-100 text-decoration-none text-body"
        >
          {content}
        </Link>
      ) : (
        <div className="card p-4 h-100" aria-busy={loading}>
          {content}
        </div>
      )}
    </div>
  );
}
