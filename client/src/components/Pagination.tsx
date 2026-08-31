export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="pagination mb-0">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            &laquo;
          </button>
        </li>
        {pages.map((p) => {
          const isActive = p === page
          return (
            <li key={p} className={`page-item ${isActive ? 'active' : ''}`}>
              <button
                type="button"
                className="page-link"
                aria-label={`Page ${p}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            </li>
          )
        })}
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination
