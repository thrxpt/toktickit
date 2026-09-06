import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Badge from '../../../src/components/Badge'

describe('STYLE-04 — Badges render text labels alongside color presentation', () => {
  it('renders "Low" for LOW priority', () => {
    render(<Badge value="LOW" />)
    const badge = screen.getByText('Low')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('zen-badge-low')
  })

  it('renders "Medium" for MEDIUM priority', () => {
    render(<Badge value="MEDIUM" />)
    const badge = screen.getByText('Medium')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('zen-badge-medium')
  })

  it('renders "High" for HIGH priority', () => {
    render(<Badge value="HIGH" />)
    const badge = screen.getByText('High')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('zen-badge-high')
  })

  it('renders "New" for NEW status', () => {
    render(<Badge value="NEW" />)
    const badge = screen.getByText('New')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('zen-badge-new')
  })

  it('renders text label rather than color alone (AC-44)', () => {
    const { rerender } = render(<Badge value="LOW" />)
    expect(screen.getByText('Low')).toBeVisible()

    rerender(<Badge value="MEDIUM" />)
    expect(screen.getByText('Medium')).toBeVisible()

    rerender(<Badge value="HIGH" />)
    expect(screen.getByText('High')).toBeVisible()

    rerender(<Badge value="NEW" />)
    expect(screen.getByText('New')).toBeVisible()
  })
})
