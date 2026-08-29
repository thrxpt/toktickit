import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import StateBlock from '../../src/components/StateBlock'

describe('StateBlock — Four variants for data-bearing views (FR-15, BR-31, BR-43)', () => {
  it('renders loading state with spinner and text', () => {
    render(<StateBlock variant="loading" message="Loading tickets…" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading tickets…')).toBeInTheDocument()
  })

  it('renders empty state explaining nothing exists and offering Create action', () => {
    const handleCreate = vi.fn()
    render(
      <StateBlock
        variant="empty"
        title="No tickets yet"
        message="You have no tickets."
        onCreate={handleCreate}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No tickets yet' })).toBeInTheDocument()
    expect(screen.getByText('You have no tickets.')).toBeInTheDocument()
    const createBtn = screen.getByRole('button', { name: 'Create Ticket' })
    expect(createBtn).toBeInTheDocument()
    fireEvent.click(createBtn)
    expect(handleCreate).toHaveBeenCalledOnce()
  })

  it('renders no-results state distinct from empty and offering Clear Filters', () => {
    const handleClear = vi.fn()
    render(
      <StateBlock
        variant="no-results"
        title="No matching tickets"
        message="No tickets matched your filter."
        onClearFilters={handleClear}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No matching tickets' })).toBeInTheDocument()
    expect(screen.getByText('No tickets matched your filter.')).toBeInTheDocument()
    const clearBtn = screen.getByRole('button', { name: 'Clear Filters' })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(handleClear).toHaveBeenCalledOnce()
  })

  it('renders error state with safe message and offers Retry', () => {
    const handleRetry = vi.fn()
    render(
      <StateBlock
        variant="error"
        title="Unable to load tickets"
        message="Something went wrong."
        onRetry={handleRetry}
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Unable to load tickets' })).toBeInTheDocument()
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalledOnce()
  })
})
