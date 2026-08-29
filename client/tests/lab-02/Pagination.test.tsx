import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Pagination from '../../src/components/Pagination'

describe('Pagination — 1-based accessible page navigation', () => {
  it('renders pagination buttons with 1-based index and aria-labels', () => {
    const handlePageChange = vi.fn()
    render(
      <Pagination
        page={1}
        totalPages={3}
        onPageChange={handlePageChange}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()

    const page2 = screen.getByRole('button', { name: 'Page 2' })
    expect(page2).toBeInTheDocument()
    fireEvent.click(page2)
    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('marks active page with aria-current="page"', () => {
    render(
      <Pagination
        page={2}
        totalPages={4}
        onPageChange={vi.fn()}
      />,
    )

    const page2 = screen.getByRole('button', { name: 'Page 2' })
    expect(page2).toHaveAttribute('aria-current', 'page')
    expect(page2.parentElement).toHaveClass('active')
  })
})
