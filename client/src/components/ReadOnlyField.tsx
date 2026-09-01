import React from 'react'

export interface ReadOnlyFieldProps {
  id?: string
  label: string
  value?: React.ReactNode
  children?: React.ReactNode
  className?: string
  multiline?: boolean
}

export function ReadOnlyField({
  id,
  label,
  value,
  children,
  className = '',
  multiline = false,
}: ReadOnlyFieldProps) {
  const fieldClass = multiline
    ? 'zen-readonly zen-readonly-field zen-readonly-multiline rounded p-2 text-break'
    : 'zen-readonly zen-readonly-field rounded p-2 text-break'

  return (
    <div className={`mb-3 ${className}`.trim()}>
      <div id={id ? `${id}-label` : undefined} className="form-label mb-1">
        {label}
      </div>
      <div id={id} className={fieldClass}>
        {children ?? value}
      </div>
    </div>
  )
}

export default ReadOnlyField
