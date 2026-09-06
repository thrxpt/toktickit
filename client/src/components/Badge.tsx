export type BadgeValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'NEW' | string

export interface BadgeProps {
  value: BadgeValue
  className?: string
}

const BADGE_MAP: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'zen-badge-low' },
  MEDIUM: { label: 'Medium', className: 'zen-badge-medium' },
  HIGH: { label: 'High', className: 'zen-badge-high' },
  NEW: { label: 'New', className: 'zen-badge-new' },
}

export function Badge({ value, className = '' }: BadgeProps) {
  const config = BADGE_MAP[value] || { label: value, className: 'bg-secondary' }

  return (
    <span className={`badge ${config.className} ${className}`.trim()}>
      {config.label}
    </span>
  )
}

export default Badge
