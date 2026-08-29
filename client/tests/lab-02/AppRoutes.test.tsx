import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import App from '../../src/App'

describe('App Routing — Route table and placeholders', () => {
  it('redirects / to /tickets', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByText('Coming in Issue 10')).toBeInTheDocument()
  })

  it('renders /select-requester placeholder', () => {
    render(
      <MemoryRouter initialEntries={['/select-requester']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Select Development Requester' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Coming in Issue 8')).toBeInTheDocument()
  })

  it('renders /tickets/new placeholder', () => {
    render(
      <MemoryRouter initialEntries={['/tickets/new']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.getByText('Coming in Issue 9')).toBeInTheDocument()
  })

  it('renders /tickets/:id placeholder with breadcrumbs', () => {
    render(
      <MemoryRouter initialEntries={['/tickets/42']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Ticket Details' })).toBeInTheDocument()
    expect(screen.getByText('Coming in Issue 11')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeInTheDocument()
  })

  it('renders /system with the Check System page inside the shell', () => {
    render(
      <MemoryRouter initialEntries={['/system']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Check System' })).toBeInTheDocument()
  })

  it('renders not-found state on unknown URL', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-page']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to My Tickets' })).toBeInTheDocument()
  })
})
