import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import AppShell from '../../../src/components/AppShell'
import { RequesterProvider, STORAGE_KEY } from '../../../src/context/RequesterContext'
import CreateTicket from '../../../src/pages/CreateTicket'

describe('STYLE-06 — Accessible names on icon-only controls (AC-46)', () => {
  it('exposes accessible names on every icon-only control in the shell', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    // Navbar toggler button for mobile
    const toggler = screen.getByRole('button', { name: /toggle navigation/i })
    expect(toggler).toBeInTheDocument()
    expect(toggler).toHaveAttribute('aria-label')

    // Profile menu button
    const profileMenu = screen.getByRole('button', { name: /requester profile|profile/i })
    expect(profileMenu).toBeInTheDocument()
    expect(profileMenu.getAttribute('aria-label') || profileMenu.textContent).toBeTruthy()
  })

  it('renders persistent notice stating Development Requester is a testing mechanism (BR-03)', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    expect(
      screen.getByText(/Development Requester.*testing mechanism.*not authentication/i),
    ).toBeInTheDocument()
  })

  it('indicates active navigation link with aria-current="page"', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    const myTicketsLink = screen.getByRole('link', { name: 'My Tickets' })
    expect(myTicketsLink).toHaveAttribute('aria-current', 'page')

    const createTicketLink = screen.getByRole('link', { name: 'Create Ticket' })
    expect(createTicketLink).not.toHaveAttribute('aria-current', 'page')
  })
})

describe('STYLE-07 — Keyboard traversal of Create Ticket (AC-45)', () => {
  it('ensures all interactive controls are reachable in visual order and readonly fields are non-focusable', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url === '/api/categories') {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'Hardware' }],
        } as Response)
      }
      if (url === '/api/related-systems') {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'Corporate Laptop' }],
        } as Response)
      }
      if (url === '/api/requesters') {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'Jennifer Anderson' }],
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    localStorage.setItem(STORAGE_KEY, '1')

    render(
      <MemoryRouter initialEntries={['/tickets/new']}>
        <RequesterProvider>
          <CreateTicket />
        </RequesterProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/^Category/i)).toBeInTheDocument()
    })

    const categorySelect = screen.getByLabelText(/^Category/i)
    const systemSelect = screen.getByLabelText(/^Related System/i)
    const prioritySelect = screen.getByLabelText(/^Requested Priority/i)
    const summaryInput = screen.getByLabelText(/^Summary/i)
    const descInput = screen.getByLabelText(/^Description/i)
    const cancelLink = screen.getByRole('link', { name: /cancel/i })
    const submitBtn = screen.getByRole('button', { name: /create ticket/i })

    // Readonly fields are not focusable via tab (tabIndex="-1")
    const readonlyFields = screen
      .getAllByRole('textbox')
      .filter((el) => el.hasAttribute('readonly'))
    expect(readonlyFields.length).toBeGreaterThan(0)
    for (const readonlyField of readonlyFields) {
      expect(readonlyField).toHaveAttribute('tabIndex', '-1')
    }

    // Verify DOM / visual order: category -> system -> priority -> summary -> desc -> cancel -> submit
    const interactiveElements = [
      categorySelect,
      systemSelect,
      prioritySelect,
      summaryInput,
      descInput,
      cancelLink,
      submitBtn,
    ]

    for (let i = 0; i < interactiveElements.length - 1; i++) {
      expect(
        interactiveElements[i].compareDocumentPosition(interactiveElements[i + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })
})
