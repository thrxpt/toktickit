import React from 'react'

export interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  busyLabel?: string
  variant?: string
  children: React.ReactNode
}

export function SubmitButton({
  loading = false,
  busyLabel = 'Submitting…',
  variant = 'primary',
  disabled,
  children,
  className = '',
  type = 'submit',
  ...rest
}: SubmitButtonProps) {
  const isDisabled = loading || disabled

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : 'false'}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          <span>{busyLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export default SubmitButton
