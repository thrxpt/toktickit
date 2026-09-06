import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RequesterProvider } from '../../src/context/RequesterContext'
import RequesterSelection from '../../src/pages/RequesterSelection'

const mockActiveRequesters = [
  { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.ac.th' },
  { id: 2, name: 'Somchai Prasert', email: 'somchai.prasert@example.ac.th' },
  { id: 3, name: 'Marcus Chen', email: 'marcus.chen@example.ac.th' },
  { id: 4, name: 'Priya Raman', email: 'priya.raman@example.ac.th' },
]

function renderWithProviders(initialEntry = '/select-requester') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RequesterProvider>
        <Routes>
          <Route path="/select-requester" element={<RequesterSelection />} />
          <Route path="/tickets" element={<div>My Tickets Page</div>} />
        </Routes>
      </RequesterProvider>
    </MemoryRouter>,
  )
}

describe('UI-01 — Requester Selection — lists active Requesters (AC-01)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders four active Requesters and omits inactive requester', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockActiveRequesters,
    } as Response)

    renderWithProviders()

    // Wait for requesters to load and dropdown to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Development Requester/i)).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/Development Requester/i) as HTMLSelectElement
    const options = Array.from(select.options).map((opt) => opt.textContent)

    // Should include placeholder plus the 4 active requesters
    expect(options).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Jennifer Anderson'),
        expect.stringContaining('Somchai Prasert'),
        expect.stringContaining('Marcus Chen'),
        expect.stringContaining('Priya Raman'),
      ]),
    )

    // Inactive requester "Daniel Okafor" should not appear anywhere in options
    expect(options.some((opt) => opt?.includes('Daniel Okafor'))).toBe(false)

    // Explanatory copy and callouts
    expect(
      screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Only active development requesters are shown/i)).toBeInTheDocument()
    expect(screen.getByText(/Authentication coming in Lab 3/i)).toBeInTheDocument()

    // Continue button is disabled until a selection is made
    const continueBtn = screen.getByRole('button', { name: /Continue/i })
    expect(continueBtn).toBeDisabled()

    // Select a requester and verify Continue becomes enabled
    fireEvent.change(select, { target: { value: '1' } })
    expect(continueBtn).not.toBeDisabled()

    // Clicking Continue establishes context and navigates to /tickets
    fireEvent.click(continueBtn)
    await waitFor(() => {
      expect(screen.getByText('My Tickets Page')).toBeInTheDocument()
    })
    expect(localStorage.getItem('toktickit_requester_id')).toBe('1')
  })
})

describe('UI-02 — Requester Selection — API failure error state (AC-06)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('displays safe error state with retry button and no stale dropdown', async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          ok: false,
          status: 500,
          json: async () => ({
            error: { code: 'DATABASE_UNAVAILABLE', message: 'Unable to reach the database' },
          }),
        } as Response
      }
      return {
        ok: true,
        json: async () => mockActiveRequesters,
      } as Response
    })

    renderWithProviders()

    // Error state appears with Retry
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
    })

    // No dropdown should be present during error state
    expect(screen.queryByLabelText(/Development Requester/i)).not.toBeInTheDocument()

    // Click Retry
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }))

    // Dropdown appears on successful retry
    await waitFor(() => {
      expect(screen.getByLabelText(/Development Requester/i)).toBeInTheDocument()
    })
  })
})

describe('UI-03 — Requester Selection — empty state (AC-07)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('displays empty state naming the seed command when no requesters exist', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/pnpm --filter server prisma db seed/i)).toBeInTheDocument()
    })

    // No dropdown should be rendered when collection is empty
    expect(screen.queryByLabelText(/Development Requester/i)).not.toBeInTheDocument()
  })
})
