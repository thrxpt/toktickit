import React from 'react'

export interface ToolbarProps {
  children?: React.ReactNode
  className?: string
}

export function Toolbar({ children, className = '' }: ToolbarProps) {
  return (
    <div
      className={`card mb-4 ${className}`.trim()}
      role="search"
      aria-label="Filter tickets"
    >
      <div className="card-body p-3">
        {children}
      </div>
    </div>
  )
}

export default Toolbar
