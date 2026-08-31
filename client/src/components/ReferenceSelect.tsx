import React from 'react'

import FormField from './FormField'

export interface ReferenceOption {
  id: number | string
  name?: string
  email?: string
  label?: string
}

export interface ReferenceSelectProps {
  id: string
  label: string
  required?: boolean
  value?: number | string | ''
  onChange?: (value: string) => void
  options: ReferenceOption[]
  placeholder?: string
  loading?: boolean
  error?: string
  helperText?: string
  disabled?: boolean
  className?: string
}

export function ReferenceSelect({
  id,
  label,
  required = false,
  value = '',
  onChange,
  options,
  placeholder = 'Select…',
  loading = false,
  error,
  helperText,
  disabled = false,
  className = '',
}: ReferenceSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      className={className}
    >
      {loading ? (
        <select
          id={id}
          className="form-select"
          disabled
          aria-label={label}
          value=""
          onChange={() => {}}
        >
          <option value="">Loading…</option>
        </select>
      ) : (
        <select
          id={id}
          className="form-select"
          disabled={disabled}
          aria-label={label}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={handleChange}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => {
            const optValue = String(option.id)
            const optLabel =
              option.label ||
              (option.name
                ? option.email
                  ? `${option.name} (${option.email})`
                  : option.name
                : String(option.id))
            return (
              <option key={optValue} value={optValue}>
                {optLabel}
              </option>
            )
          })}
        </select>
      )}
    </FormField>
  )
}

export default ReferenceSelect
