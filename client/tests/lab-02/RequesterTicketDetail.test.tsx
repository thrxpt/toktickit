import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppShell from '../../src/components/AppShell'
import RequesterGuard from '../../src/components/RequesterGuard'
import { RequesterProvider, STORAGE_KEY } from '../../src/context/RequesterContext'
import RequesterTicketDetail from '../../src/pages/RequesterTicketDetail'

const mockRequesters = [
  { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.ac.th' },
  { id: 2, name: 'Somchai Prasert', email: 'somchai.prasert@example.ac.th' },
]

const mockTicketDetail = {
  id: 42,
  ticketNumber: 'TKT-2026-000042',
  summary: 'Laptop battery drains quickly',
  description: 'Line 1: My laptop battery is draining.\nLine 2: Even when idle.',
  requestedPriority: 'MEDIUM',
  status: 'NEW',
  category: { id: 2, name: 'Hardware' },
  relatedSystem: { id: 7, name: 'Corporate Laptop' },
  requester: { id: 1, name: 'Jennifer Anderson' },
  createdAt: '2026-08-26T09:14:00.000Z',
  updatedAt: '2026-08-26T09:14:00.000Z',
  attachments: {
    active: [],
    removed: [],
  },
}

function renderTicketDetail(ticketId = '42') {
  return render(
    <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
      <RequesterProvider>
        <Routes>
          <Route
            path="/tickets/:id"
            element={
              <RequesterGuard>
                <AppShell
                  breadcrumbs={[
                    { label: 'My Tickets', to: '/tickets' },
                    { label: 'Ticket Details' },
                  ]}
                >
                  <RequesterTicketDetail />
                </AppShell>
              </RequesterGuard>
            }
          />
          <Route path="/tickets" element={<div>My Tickets Page</div>} />
          <Route path="/select-requester" element={<div>Select Requester Page</div>} />
        </Routes>
      </RequesterProvider>
    </MemoryRouter>,
  )
}

describe('Ticket Detail Screen (Issue 11)', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, '1')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('UI-17 — Ticket Detail — All fields read-only; no editable control (AC-29)', () => {
    it('renders all ticket fields in read-only presentation and no editable controls exist', async () => {
      globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url === '/api/requesters') {
          return Promise.resolve({
            ok: true,
            json: async () => mockRequesters,
          } as Response)
        }
        if (url === '/api/tickets/42') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockTicketDetail,
          } as Response)
        }
        return Promise.reject(new Error(`Unhandled request: ${url}`))
      })

      renderTicketDetail('42')

      // Wait for ticket to load
      await waitFor(() => {
        expect(screen.getByText('TKT-2026-000042')).toBeInTheDocument()
      })

      // Breadcrumb and Back to My Tickets navigation (ui-spec.md §4, §5.4)
      expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Back to My Tickets/i })).toHaveAttribute(
        'href',
        '/tickets',
      )

      // Heading and field values
      expect(screen.getByRole('heading', { name: 'Ticket Details' })).toBeInTheDocument()
      expect(screen.getByText('Ticket No.')).toBeInTheDocument()
      expect(screen.getByText('TKT-2026-000042')).toBeInTheDocument()

      expect(screen.getByText('Ticket Date')).toBeInTheDocument()
      expect(screen.getByText('Aug 26, 2026')).toBeInTheDocument()

      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Hardware')).toBeInTheDocument()

      expect(screen.getByText('Related System')).toBeInTheDocument()
      expect(screen.getByText('Corporate Laptop')).toBeInTheDocument()

      expect(screen.getByText('Requester')).toBeInTheDocument()
      expect(screen.getAllByText('Jennifer Anderson').length).toBeGreaterThanOrEqual(1)

      expect(screen.getByText('Requested Priority')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()

      expect(screen.getByText('Current Status')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()

      expect(screen.getByText('Summary')).toBeInTheDocument()
      expect(screen.getByText('Laptop battery drains quickly')).toBeInTheDocument()

      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(
        screen.getByText((content) =>
          content.includes('Line 1: My laptop battery is draining.') &&
          content.includes('Line 2: Even when idle.'),
        ),
      ).toBeInTheDocument()

      // AC-29, STYLE-03: No editable controls (no textbox, combobox, spinbutton)
      expect(screen.queryAllByRole('textbox')).toHaveLength(0)
      expect(screen.queryAllByRole('combobox')).toHaveLength(0)
      expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    })
  })

  describe('UI-18 — Detail of an unowned or nonexistent Ticket (AC-30)', () => {
    it('renders not-found state and renders NO ticket data', async () => {
      const confidentialSummary = 'Secret Financial Ticket 12345'
      const confidentialDesc = 'Super secret financial info'

      globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url === '/api/requesters') {
          return Promise.resolve({
            ok: true,
            json: async () => mockRequesters,
          } as Response)
        }
        if (url === '/api/tickets/99') {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: async () => ({
              error: {
                code: 'TICKET_NOT_FOUND',
                message: 'Ticket not found',
              },
            }),
          } as Response)
        }
        return Promise.reject(new Error(`Unhandled request: ${url}`))
      })

      renderTicketDetail('99')

      // Wait for Not Found state to render
      await waitFor(() => {
        expect(screen.getByText(/Ticket Not Found/i)).toBeInTheDocument()
      })

      // Must offer a way back to My Tickets
      expect(
        screen.getByRole('link', { name: /Back to My Tickets/i }),
      ).toBeInTheDocument()

      // AC-30: No ticket data appears in the DOM
      expect(screen.queryByText(confidentialSummary)).not.toBeInTheDocument()
      expect(screen.queryByText(confidentialDesc)).not.toBeInTheDocument()
      expect(screen.queryByText('TKT-2026-000099')).not.toBeInTheDocument()
    })

    it('renders error state with retry on 500 server error', async () => {
      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url === '/api/requesters') {
          return Promise.resolve({
            ok: true,
            json: async () => mockRequesters,
          } as Response)
        }
        if (url === '/api/tickets/42') {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              ok: false,
              status: 500,
              json: async () => ({
                error: {
                  code: 'DATABASE_UNAVAILABLE',
                  message: 'Unable to reach the database',
                },
              }),
            } as Response)
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockTicketDetail,
          } as Response)
        }
        return Promise.reject(new Error(`Unhandled request: ${url}`))
      })

      renderTicketDetail('42')

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
      })

      // Click Retry to recover
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }))

      await waitFor(() => {
        expect(screen.getByText('TKT-2026-000042')).toBeInTheDocument()
      })
    })
  })
})
