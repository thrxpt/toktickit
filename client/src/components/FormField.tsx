import React, { isValidElement, type ReactElement } from 'react'

export interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  helperText?: string
  readOnly?: boolean
  readOnlyValue?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function FormField({
  id,
  label,
  required = false,
  error,
  helperText,
  readOnly = false,
  readOnlyValue,
  children,
  className = '',
}: FormFieldProps) {
  const errorId = `${id}-error`
  const helperId = `${id}-help`

  let controlContent: React.ReactNode = children

  if (readOnly) {
    controlContent = (
      <div
        id={id}
        className="form-control zen-readonly"
        aria-readonly="true"
      >
        {readOnlyValue ?? children}
      </div>
    )
  } else if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>
    const existingClassName = typeof child.props.className === 'string' ? child.props.className : 'form-control'
    const newClassName = `${existingClassName} ${error ? 'is-invalid' : ''}`.trim()
    const ariaDescribedBy =
      (error ? errorId : helperText ? helperId : undefined) ||
      (typeof child.props['aria-describedby'] === 'string' ? child.props['aria-describedby'] : undefined)

    controlContent = React.cloneElement(child, {
      id: child.props.id || id,
      'aria-invalid': error ? 'true' : child.props['aria-invalid'],
      'aria-describedby': ariaDescribedBy,
      className: newClassName,
    })
  }

  return (
    <div className={`mb-3 ${className}`.trim()}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && (
          <span className="text-danger ms-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {controlContent}
      {error && (
        <div id={errorId} className="invalid-feedback d-block">
          {error}
        </div>
      )}
      {!error && helperText && (
        <div id={helperId} className="form-text">
          {helperText}
        </div>
      )}
    </div>
  )
}

export default FormField
