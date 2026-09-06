import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/App'

const mockActiveRequesters = [
  { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.ac.th' },
]

describe('UI-22 — App Routing — Route table and shell placeholders', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('toktickit_requester_id', '1')
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url === '/api/requesters') {
        return Promise.resolve({
          ok: true,
          json: async () => mockActiveRequesters,
        } as Response)
      }
      if (url.startsWith('/api/tickets/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 42,
            ticketNumber: 'TKT-2026-000042',
            summary: 'Test summary',
            description: 'Test description',
            requestedPriority: 'MEDIUM',
            status: 'NEW',
            category: { id: 1, name: 'Account and Access' },
            relatedSystem: { id: 1, name: 'Email' },
            requester: { id: 1, name: 'Jennifer Anderson' },
            createdAt: '2026-08-26T09:14:00.000Z',
            updatedAt: '2026-08-26T09:14:00.000Z',
            attachments: { active: [], removed: [] },
          }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      } as Response)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects / to /tickets and renders My Tickets screen', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'My Tickets' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText(/View and track all of your support requests/i),
    ).toBeInTheDocument()
  })

  it('renders /select-requester screen', async () => {
    render(
      <MemoryRouter initialEntries={['/select-requester']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Select Development Requester' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i),
    ).toBeInTheDocument()
  })

  it('renders /tickets/new screen when context is established', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets/new']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Create Ticket' }),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Create Ticket' })).toBeInTheDocument()
  })

  it('renders /tickets/:id screen with breadcrumbs when context is established', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets/42']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Ticket Details' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('navigation', { name: 'breadcrumb' }),
    ).toBeInTheDocument()
    expect(screen.getByText('TKT-2026-000042')).toBeInTheDocument()
  })

  it('renders /system with the Check System page inside the shell', async () => {
    render(
      <MemoryRouter initialEntries={['/system']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Check System' }),
      ).toBeInTheDocument()
    })
  })

  it('renders not-found state on unknown URL', async () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-page']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Page Not Found' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('link', { name: 'Go to My Tickets' }),
    ).toBeInTheDocument()
  })
})
