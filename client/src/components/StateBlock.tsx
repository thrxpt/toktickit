import React from 'react'

export interface StateBlockProps {
  variant: 'loading' | 'empty' | 'no-results' | 'error'
  title?: string
  message?: string
  action?: React.ReactNode
  onRetry?: () => void
  onClearFilters?: () => void
  onCreate?: () => void
  className?: string
}

export function StateBlock({
  variant,
  title,
  message,
  action,
  onRetry,
  onClearFilters,
  onCreate,
  className = '',
}: StateBlockProps) {
  if (variant === 'loading') {
    return (
      <div
        className={`text-center py-5 ${className}`.trim()}
        role="status"
        aria-live="polite"
      >
        <div className="spinner-border text-primary mb-3" aria-hidden="true" />
        <p className="text-body-secondary mb-0">{message || 'Loading…'}</p>
      </div>
    )
  }

  if (variant === 'empty') {
    return (
      <div className={`card text-center py-5 px-4 ${className}`.trim()}>
        <div className="card-body">
          <h2 className="h4 mb-2">{title || 'No tickets yet'}</h2>
          <p className="text-body-secondary mb-4">
            {message || 'You have not created any support tickets yet.'}
          </p>
          {action || (onCreate && (
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              Create Ticket
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'no-results') {
    return (
      <div className={`card text-center py-5 px-4 ${className}`.trim()}>
        <div className="card-body">
          <h2 className="h4 mb-2">{title || 'No matching tickets'}</h2>
          <p className="text-body-secondary mb-4">
            {message || 'No tickets matched your search or filter criteria.'}
          </p>
          {action || (onClearFilters && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={onClearFilters}
            >
              Clear Filters
            </button>
          ))}
        </div>
      </div>
    )
  }

  // variant === 'error'
  return (
    <div className={`card text-center py-5 px-4 border-danger-subtle ${className}`.trim()} role="alert">
      <div className="card-body">
        <h2 className="h4 mb-2 text-danger">{title || 'Something went wrong'}</h2>
        <p className="text-body-secondary mb-4">
          {message || 'Unable to load data. Please try again.'}
        </p>
        {action || (onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        ))}
      </div>
    </div>
  )
}

export default StateBlock
