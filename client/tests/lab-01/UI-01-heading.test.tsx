import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from '../../src/App'

describe('UI-01 — TokTickIT heading renders', () => {
  it('shows the TokTickIT heading', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'TokTickIT' })).toBeInTheDocument()
  })

  it('shows the Check System button, disabled until Issue 2 wires it', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Check System' })).toBeDisabled()
  })
})
