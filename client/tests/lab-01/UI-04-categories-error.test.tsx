import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/App'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-04 — GET /api/categories failure renders a useful error message', () => {
  it('shows System Status: Offline with a categories-specific message when the API is up but categories fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.includes('/api/health')) {
          return { ok: true, json: () => Promise.resolve({ status: 'ok', service: 'TokTickIT API' }) }
        }

        return { ok: false, json: () => Promise.resolve({ error: 'Unable to reach the database' }) }
      }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    await waitFor(() => {
      expect(screen.getByText('System Status: Offline')).toBeInTheDocument()
    })
    expect(screen.getByText('Unable to load Request Categories')).toBeInTheDocument()
  })
})
