import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import AppShell from '../../../src/components/AppShell'

describe('STYLE-06 — Accessible names on icon-only controls (AC-46)', () => {
  it('exposes accessible names on every icon-only control in the shell', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    // Navbar toggler button for mobile
    const toggler = screen.getByRole('button', { name: /toggle navigation/i })
    expect(toggler).toBeInTheDocument()
    expect(toggler).toHaveAttribute('aria-label')

    // Profile menu button
    const profileMenu = screen.getByRole('button', { name: /requester profile|profile/i })
    expect(profileMenu).toBeInTheDocument()
    expect(profileMenu.getAttribute('aria-label') || profileMenu.textContent).toBeTruthy()
  })

  it('renders persistent notice stating Development Requester is a testing mechanism (BR-03)', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    expect(
      screen.getByText(/Development Requester.*testing mechanism.*not authentication/i),
    ).toBeInTheDocument()
  })

  it('indicates active navigation link with aria-current="page"', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    const myTicketsLink = screen.getByRole('link', { name: 'My Tickets' })
    expect(myTicketsLink).toHaveAttribute('aria-current', 'page')

    const createTicketLink = screen.getByRole('link', { name: 'Create Ticket' })
    expect(createTicketLink).not.toHaveAttribute('aria-current', 'page')
  })
})
