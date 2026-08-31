import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/App'
import { useRequester } from '../../src/context/RequesterContext'

const mockActiveRequesters = [
  { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.ac.th' },
  { id: 2, name: 'Somchai Prasert', email: 'somchai.prasert@example.ac.th' },
  { id: 3, name: 'Marcus Chen', email: 'marcus.chen@example.ac.th' },
  { id: 4, name: 'Priya Raman', email: 'priya.raman@example.ac.th' },
]

describe('UI-04 — Guard redirects when no Requester context (AC-02, FR-04)', () => {
  beforeEach(() => {
    localStorage.clear()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockActiveRequesters,
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to /select-requester when attempting to access /tickets without context', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Select Development Requester/i }),
      ).toBeInTheDocument()
    })
  })
})

describe('UI-05 — Persisted selection restored across reload (AC-03)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('toktickit_requester_id', '1')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockActiveRequesters,
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restores Jennifer Anderson context without redirecting to selector', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <App />
      </MemoryRouter>,
    )

    // Should stay on /tickets and display Jennifer Anderson in profile
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Tickets/i })).toBeInTheDocument()
    })

    expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()
  })
})

describe('UI-06 — Change Requester discards previous state (AC-04, BR-09)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('toktickit_requester_id', '1')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockActiveRequesters,
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('discards previous ticket data when changing Requester', async () => {
    // A mock ticket view that tracks state
    function TestTicketView() {
      const { selectedRequester } = useRequester()
      return (
        <div data-testid="ticket-view">
          <h2>Tickets for {selectedRequester?.name}</h2>
          <div data-testid="ticket-list">
            {selectedRequester?.id === 1 ? (
              <div data-testid="ticket-row-1">Requester 1 Ticket: Laptop issue</div>
            ) : (
              <div data-testid="ticket-row-2">Requester 2 Ticket: VPN issue</div>
            )}
          </div>
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <App customTicketView={<TestTicketView />} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('ticket-row-1')).toBeInTheDocument()
    })
    expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()

    // Open profile menu and click Change Requester
    const profileBtn = screen.getByRole('button', { name: /Requester profile/i })
    fireEvent.click(profileBtn)

    const changeRequesterLink = screen.getByRole('link', { name: /Change Requester/i })
    fireEvent.click(changeRequesterLink)

    // Now on /select-requester
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Select Development Requester/i }),
      ).toBeInTheDocument()
    })

    // Previous tickets are no longer rendered
    expect(screen.queryByTestId('ticket-row-1')).not.toBeInTheDocument()

    // Select Requester 2 (Somchai Prasert)
    const select = screen.getByLabelText(/Development Requester/i)
    fireEvent.change(select, { target: { value: '2' } })

    const continueBtn = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueBtn)

    // Now back on /tickets with Requester 2
    await waitFor(() => {
      expect(screen.getByTestId('ticket-row-2')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('ticket-row-1')).not.toBeInTheDocument()
    expect(screen.getByText('Somchai Prasert')).toBeInTheDocument()
  })
})

describe('UI-07 — Inactive persisted selection cleared on load (AC-05)', () => {
  beforeEach(() => {
    localStorage.clear()
    // ID 5 is inactive Daniel Okafor, not returned in active requesters list
    localStorage.setItem('toktickit_requester_id', '5')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockActiveRequesters,
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears inactive persisted selection and redirects to selector', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Select Development Requester/i }),
      ).toBeInTheDocument()
    })

    expect(localStorage.getItem('toktickit_requester_id')).toBeNull()
  })
})
