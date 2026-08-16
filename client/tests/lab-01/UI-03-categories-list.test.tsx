import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/App'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-03 — Request Categories from GET /api/categories', () => {
  it('resolves loading into the category list on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.includes('/api/health')) {
          return { ok: true, json: () => Promise.resolve({ status: 'ok', service: 'TokTickIT API' }) }
        }

        return {
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, name: 'Account and Access' },
              { id: 2, name: 'Hardware' },
              { id: 3, name: 'Software' },
              { id: 4, name: 'Network' },
            ]),
        }
      }),
    )

    render(<App />)
    const button = screen.getByRole('button', { name: 'Check System' })
    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled()

    await waitFor(() => {
      expect(screen.getByText('System Status: Online')).toBeInTheDocument()
    })

    expect(screen.getByText('Account and Access')).toBeInTheDocument()
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Software')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
  })
})
