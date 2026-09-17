import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '../../src/auth/AuthContext'
import AppShell from '../../src/components/AppShell'
import type { AuthenticatedUser } from '../../src/types/auth'

function renderAppShellWithUser(
  user: AuthenticatedUser,
  initialEntry = '/tickets',
  onLogout?: () => void,
) {
  globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url === '/api/auth/me') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ user }),
      } as Response)
    }
    if (url === '/api/auth/logout') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Logged out successfully.' }),
      } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
  })

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route
            path="*"
            element={
              <AppShell onLogout={onLogout}>
                <div>Content Body</div>
              </AppShell>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('UI-04 — AppShell renders user name, role badge, and handles Logout (AC-05, FR-04)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders user initials avatar, full name, and role badge for authenticated Requester', async () => {
    const user: AuthenticatedUser = {
      id: 1,
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@example.ac.th',
      role: 'REQUESTER',
      mustChangePassword: false,
    }

    renderAppShellWithUser(user)

    await waitFor(() => {
      expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()
    })

    // Initials avatar
    expect(screen.getByText('JA')).toBeInTheDocument()
    // Role badge
    const badge = screen.getByText('Requester')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('zen-badge-role-requester')
  })

  it('renders IT Staff name, avatar initials, and blue role badge', async () => {
    const user: AuthenticatedUser = {
      id: 2,
      name: 'Michael Brown',
      email: 'michael.brown@toktickit.com',
      role: 'IT_STAFF',
      mustChangePassword: false,
    }

    renderAppShellWithUser(user)

    await waitFor(() => {
      expect(screen.getByText('Michael Brown')).toBeInTheDocument()
    })

    expect(screen.getByText('MB')).toBeInTheDocument()
    const badge = screen.getByText('IT Staff')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('zen-badge-role-staff')
  })

  it('renders Administrator name, avatar initials, and purple role badge', async () => {
    const user: AuthenticatedUser = {
      id: 3,
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@toktickit.com',
      role: 'ADMINISTRATOR',
      mustChangePassword: false,
    }

    renderAppShellWithUser(user)

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument()
    })

    expect(screen.getByText('SJ')).toBeInTheDocument()
    const badge = screen.getByText('Administrator')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('zen-badge-role-admin')
  })

  it('opens profile dropdown displaying email and executes Logout redirection (AC-05)', async () => {
    const user: AuthenticatedUser = {
      id: 1,
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@example.ac.th',
      role: 'REQUESTER',
      mustChangePassword: false,
    }

    renderAppShellWithUser(user)

    await waitFor(() => {
      expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()
    })

    // Open profile dropdown
    const profileBtn = screen.getByRole('button', { name: /User profile/i })
    fireEvent.click(profileBtn)

    expect(screen.getByText('jennifer.anderson@example.ac.th')).toBeInTheDocument()
    const logoutBtn = screen.getByRole('button', { name: /Logout/i })
    expect(logoutBtn).toBeInTheDocument()
    expect(logoutBtn).toHaveClass('text-danger')

    // Click logout
    fireEvent.click(logoutBtn)

    await waitFor(() => {
      expect(screen.getByText('Login Screen')).toBeInTheDocument()
    })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.anything())
  })
})

describe('UI-15 — Role-based navigation hides unauthorized links (FR-20)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Requester sees My Tickets and Create Ticket, but NOT Ticket Queue or Users', async () => {
    const user: AuthenticatedUser = {
      id: 1,
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@example.ac.th',
      role: 'REQUESTER',
      mustChangePassword: false,
    }

    renderAppShellWithUser(user)

    await waitFor(() => {
      expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ticket Queue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('IT Staff sees Ticket Queue, but NOT My Tickets, Create Ticket, or Users', async () => {
    const user: AuthenticatedUser = {
      id: 2,
      name: 'Michael Brown',
      email: 'michael.brown@toktickit.com',
      role: 'IT_STAFF',
      mustChangePassword: false,
    }

    renderAppShellWithUser(user, '/staff/queue')

    await waitFor(() => {
      expect(screen.getByText('Michael Brown')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'Ticket Queue' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Tickets' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Ticket' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('Administrator sees Users, but NOT Ticket Queue or Create Ticket', async () => {
    const user: AuthenticatedUser = {
      id: 3,
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@toktickit.com',
      role: 'ADMINISTRATOR',
      mustChangePassword: false,
    }

    renderAppShellWithUser(user, '/admin/users')

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ticket Queue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Tickets' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Ticket' })).not.toBeInTheDocument()
  })
})
