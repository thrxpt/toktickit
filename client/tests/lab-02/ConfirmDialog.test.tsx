import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import ConfirmDialog from '../../src/components/ConfirmDialog'

function DialogTestWrapper() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} data-testid="open-btn">
        Open Dialog
      </button>
      <ConfirmDialog
        isOpen={open}
        title="Confirm Removal"
        message="Are you sure you want to remove this item?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

describe('UI-24 — ConfirmDialog — accessible dialog with focus management and Escape handling', () => {
  it('renders modal dialog when open with title, message, and actions', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Removal"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Confirm Removal' })).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('closes when Escape key is pressed', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('restores focus to the trigger element when closed', () => {
    render(<DialogTestWrapper />)
    const openBtn = screen.getByTestId('open-btn')

    openBtn.focus()
    expect(document.activeElement).toBe(openBtn)

    fireEvent.click(openBtn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Close via cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(openBtn)
  })
})
