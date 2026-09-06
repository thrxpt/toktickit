import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CheckSystem from '../../src/pages/CheckSystem'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-02 — System Status from GET /api/health', () => {
  it('shows System Status: Online after a successful check', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.includes('/api/health')) {
          return { ok: true, json: () => Promise.resolve({ status: 'ok', service: 'TokTickIT API' }) }
        }

        return { ok: true, json: () => Promise.resolve([{ id: 1, name: 'Account and Access' }]) }
      }),
    )

    render(<CheckSystem />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    await waitFor(() => {
      expect(screen.getByText('System Status: Online')).toBeInTheDocument()
    })
  })

  it('shows System Status: Offline and a useful message when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    render(<CheckSystem />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    await waitFor(() => {
      expect(screen.getByText('System Status: Offline')).toBeInTheDocument()
    })
    expect(screen.getByText('Unable to connect to TokTickIT API')).toBeInTheDocument()
  })
})
