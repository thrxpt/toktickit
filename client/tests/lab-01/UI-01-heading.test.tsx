import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import CheckSystem from '../../src/pages/CheckSystem'

describe('UI-01 — TokTickIT heading renders', () => {
  it('shows the TokTickIT heading', () => {
    render(<CheckSystem />)

    expect(screen.getByRole('heading', { name: 'TokTickIT' })).toBeInTheDocument()
  })

  it('shows the Check System button, enabled', () => {
    render(<CheckSystem />)

    expect(screen.getByRole('button', { name: 'Check System' })).toBeEnabled()
  })
})
