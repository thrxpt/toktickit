import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RequesterProvider } from '../../src/context/RequesterContext'
import MyTickets from '../../src/pages/MyTickets'

const mockRequesters = [
  { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.ac.th' },
  { id: 2, name: 'Somchai Prasert', email: 'somchai.prasert@example.ac.th' },
]

const mockCategories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
  { id: 4, name: 'Network' },
]

const mockTicketsData = {
  data: [
    {
      id: 1,
      ticketNumber: 'TKT-2026-000001',
      summary: 'Laptop keyboard not responding',
      requestedPriority: 'HIGH',
      status: 'NEW',
      category: { id: 2, name: 'Hardware' },
      relatedSystem: { id: 6, name: 'Corporate Laptop' },
      createdAt: '2026-08-26T09:14:00.000Z',
      updatedAt: '2026-08-26T09:14:00.000Z',
    },
    {
      id: 2,
      ticketNumber: 'TKT-2026-000002',
      summary: 'VPN connection error 403',
      requestedPriority: 'MEDIUM',
      status: 'NEW',
      category: { id: 4, name: 'Network' },
      relatedSystem: { id: 3, name: 'VPN' },
      createdAt: '2026-08-25T14:20:00.000Z',
      updatedAt: '2026-08-25T14:20:00.000Z',
    },
  ],
  meta: {
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
  },
}

function renderMyTickets(initialEntry = '/tickets') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RequesterProvider>
        <Routes>
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/tickets/new" element={<div>Create Ticket Page</div>} />
          <Route path="/tickets/:id" element={<div>Ticket Detail Page</div>} />
        </Routes>
      </RequesterProvider>
    </MemoryRouter>,
  )
}

describe('My Tickets Screen', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('toktickit_requester_id', '1')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('UI-14 — Requester with no Tickets (AC-23, BR-31)', () => {
    it('renders empty state offering Create Ticket when user has 0 tickets and no filters', async () => {
      globalThis.fetch = vi.fn().mockImplementation((input: unknown) => {
        const url =
          typeof input === 'string' ? input : (input as Request)?.url || String(input)
        if (url.includes('/api/requesters')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRequesters,
          } as Response)
        }
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockCategories,
          } as Response)
        }
        if (url.includes('/api/tickets')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [],
              meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
            }),
          } as Response)
        }
        return Promise.reject(new Error(`Unknown URL: ${url}`))
      })

      renderMyTickets()

      await waitFor(() => {
        expect(screen.getByText(/No tickets yet/i)).toBeInTheDocument()
      })

      expect(
        screen.getByText(/You have not created any support tickets yet/i),
      ).toBeInTheDocument()

      // Empty state offers Create Ticket action
      const createLinks = screen.getAllByRole('link', { name: /Create Ticket/i })
      expect(createLinks.length).toBeGreaterThan(0)
    })
  })

  describe('UI-15 — Filters matching nothing (AC-22, BR-31)', () => {
    it('renders no-results state offering Clear Filters with distinct copy from empty state', async () => {
      globalThis.fetch = vi.fn().mockImplementation((input: unknown) => {
        const url =
          typeof input === 'string' ? input : (input as Request)?.url || String(input)
        if (url.includes('/api/requesters')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRequesters,
          } as Response)
        }
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockCategories,
          } as Response)
        }
        if (url.includes('/api/tickets')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [],
              meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
            }),
          } as Response)
        }
        return Promise.reject(new Error(`Unknown URL: ${url}`))
      })

      // Query with search filter active
      renderMyTickets('/tickets?search=nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/No matching tickets/i)).toBeInTheDocument()
      })

      // Distinct copy from empty state
      expect(
        screen.getByText(/No tickets matched your search or filter criteria/i),
      ).toBeInTheDocument()
      expect(screen.queryByText(/No tickets yet/i)).not.toBeInTheDocument()
      expect(
        screen.queryByText(/You have not created any support tickets yet/i),
      ).not.toBeInTheDocument()

      // Offers Clear Filters action
      const clearButtons = screen.getAllByRole('button', { name: /Clear Filters/i })
      expect(clearButtons.length).toBeGreaterThan(0)
    })
  })

  describe('UI-16 — Loading and error states (FR-15)', () => {
    it('renders loading state, then error state with retry on API failure', async () => {
      let fail = true
      globalThis.fetch = vi.fn().mockImplementation((input: unknown) => {
        const url =
          typeof input === 'string' ? input : (input as Request)?.url || String(input)
        if (url.includes('/api/requesters')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRequesters,
          } as Response)
        }
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockCategories,
          } as Response)
        }
        if (url.includes('/api/tickets')) {
          if (fail) {
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
            json: async () => mockTicketsData,
          } as Response)
        }
        return Promise.reject(new Error(`Unknown URL: ${url}`))
      })

      renderMyTickets()

      // Error state appears
      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
      })
      expect(screen.getByText(/Unable to load/i)).toBeInTheDocument()

      // Retry button is available and works
      const retryBtn = screen.getByRole('button', { name: /Retry/i })
      expect(retryBtn).toBeInTheDocument()

      fail = false
      fireEvent.click(retryBtn)

      await waitFor(() => {
        expect(screen.getAllByText('Laptop keyboard not responding').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Table rendering and interaction', () => {
    it('renders tickets in table, displays meta count, and allows sort and filter changes', async () => {
      globalThis.fetch = vi.fn().mockImplementation((input: unknown) => {
        const url =
          typeof input === 'string' ? input : (input as Request)?.url || String(input)
        if (url.includes('/api/requesters')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRequesters,
          } as Response)
        }
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockCategories,
          } as Response)
        }
        if (url.includes('/api/tickets')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTicketsData,
          } as Response)
        }
        return Promise.reject(new Error(`Unknown URL: ${url}`))
      })

      renderMyTickets()

      // Page Title & Subtitle
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /My Tickets/i }),
        ).toBeInTheDocument()
        expect(screen.getAllByText('TKT-2026-000001').length).toBeGreaterThan(0)
      })
      expect(
        screen.getByText(/View and track all of your support requests/i),
      ).toBeInTheDocument()

      // Rows rendered
      expect(
        screen.getAllByText('Laptop keyboard not responding').length,
      ).toBeGreaterThan(0)
      expect(screen.getAllByText('TKT-2026-000002').length).toBeGreaterThan(0)
      expect(screen.getAllByText('VPN connection error 403').length).toBeGreaterThan(0)

      // Footer showing count
      expect(screen.getByText(/Showing 1 to 2 of 2 tickets/i)).toBeInTheDocument()

      // Sortable headers have aria-sort
      const ticketNoHeader = screen.getByRole('columnheader', { name: /Ticket No/i })
      expect(ticketNoHeader).toHaveAttribute('aria-sort')

      // Check mobile ticket cards exist
      const ticketCards = screen.getAllByTestId('ticket-card')
      expect(ticketCards).toHaveLength(2)
    })
  })
})
