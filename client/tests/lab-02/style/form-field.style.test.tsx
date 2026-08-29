import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import FormField from '../../../src/components/FormField'

describe('STYLE-01 — Required field marking and validation message', () => {
  it('renders an asterisk when required and no asterisk when optional', () => {
    const { rerender } = render(
      <FormField id="summary" label="Summary" required>
        <input type="text" />
      </FormField>,
    )

    const label = screen.getByText(/Summary/)
    expect(label).toBeInTheDocument()
    expect(label.querySelector('.text-danger') ?? screen.getByText('*')).toHaveTextContent('*')

    rerender(
      <FormField id="summary" label="Summary" required={false}>
        <input type="text" />
      </FormField>,
    )

    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('renders both the asterisk and the validation message when required and invalid', () => {
    render(
      <FormField id="summary" label="Summary" required error="Summary is required">
        <input type="text" />
      </FormField>,
    )

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('Summary is required')).toBeInTheDocument()
  })
})

describe('STYLE-02 — Validation message placement and accessible linkage', () => {
  it('renders message as a sibling of the field with aria-describedby and aria-invalid', () => {
    render(
      <FormField id="summary" label="Summary" error="Summary is required">
        <input type="text" data-testid="summary-input" />
      </FormField>,
    )

    const input = screen.getByTestId('summary-input')
    const message = screen.getByText('Summary is required')

    // Message is a sibling of the control or within the same field group
    expect(input.parentElement).toContainElement(message)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', message.id)
    expect(message).toHaveClass('invalid-feedback')
  })
})

describe('STYLE-03 — Read-only vs editable field presentation', () => {
  it('renders read-only fields with read-only class and as non-focusable elements', () => {
    render(
      <FormField
        id="ticket-no"
        label="Ticket No."
        readOnly
        readOnlyValue="TKT-2026-000001"
      />,
    )

    const readonlyElement = screen.getByText('TKT-2026-000001')
    expect(readonlyElement).toHaveClass('zen-readonly')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders editable fields as standard focusable inputs', () => {
    render(
      <FormField id="summary" label="Summary">
        <input type="text" />
      </FormField>,
    )

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).not.toHaveClass('zen-readonly')
  })
})
