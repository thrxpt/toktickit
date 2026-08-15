import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/App'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-02 — System Status from GET /api/health', () => {
  it('shows System Status: Online after a successful check', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', service: 'TokTickIT API' }),
      }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    await waitFor(() => {
      expect(screen.getByText('System Status: Online')).toBeInTheDocument()
    })
  })

  it('shows System Status: Offline and a useful message when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    await waitFor(() => {
      expect(screen.getByText('System Status: Offline')).toBeInTheDocument()
    })
    expect(screen.getByText('Unable to connect to TokTickIT API')).toBeInTheDocument()
  })
})
