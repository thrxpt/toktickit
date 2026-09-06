import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SubmitButton from '../../../src/components/SubmitButton'

describe('STYLE-05 — SubmitButton busy state', () => {
  it('renders normal state with children and enabled by default', () => {
    render(<SubmitButton>Create Ticket</SubmitButton>)

    const button = screen.getByRole('button', { name: 'Create Ticket' })
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-busy', 'false')
    expect(button.querySelector('.spinner-border')).not.toBeInTheDocument()
  })

  it('renders busy state with spinner, disabled state, and accessible busy label', () => {
    render(
      <SubmitButton loading busyLabel="Creating…">
        Create Ticket
      </SubmitButton>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.spinner-border')).toBeInTheDocument()
    expect(screen.getByText('Creating…')).toBeInTheDocument()
  })

  it('defaults busy label to Submitting… when loading is true and busyLabel is omitted', () => {
    render(<SubmitButton loading>Submit</SubmitButton>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Submitting…')).toBeInTheDocument()
  })
})
