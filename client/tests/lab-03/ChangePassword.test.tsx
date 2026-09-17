import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '../../src/auth/AuthContext'
import ChangePassword from '../../src/pages/ChangePassword'
import { RequireAuth } from '../../src/routes/RequireAuth'
import { RequirePasswordChange } from '../../src/routes/RequirePasswordChange'

function renderAppWithGuards(
  initialEntry = '/tickets',
  userOverride?: Record<string, unknown>,
  onPasswordChanged?: () => void,
) {
  let mustChangePassword =
    userOverride && 'mustChangePassword' in userOverride
      ? (userOverride.mustChangePassword as boolean)
      : true

  const defaultUser = {
    id: 2,
    name: 'Somchai Prasert',
    email: 'somchai.prasert@example.ac.th',
    role: 'REQUESTER',
    ...userOverride,
  }

  globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url === '/api/auth/me') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          user: { ...defaultUser, mustChangePassword },
        }),
      } as Response)
    }
    if (url === '/api/auth/change-password') {
      mustChangePassword = false
      if (onPasswordChanged) onPasswordChanged()
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          user: { ...defaultUser, mustChangePassword: false },
        }),
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
            path="/change-password"
            element={
              <RequirePasswordChange>
                <ChangePassword />
              </RequirePasswordChange>
            }
          />
          <Route
            path="/tickets"
            element={
              <RequireAuth>
                <div>My Tickets Screen</div>
              </RequireAuth>
            }
          />
          <Route
            path="/staff/queue"
            element={
              <RequireAuth>
                <div>Staff Queue Screen</div>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('UI-02 — User with mustChangePassword forced to Change Password screen (AC-02, BR-02)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects user with mustChangePassword: true from /tickets to /change-password', async () => {
    renderAppWithGuards('/tickets', { mustChangePassword: true })

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Change Your Password' }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText('You must change your password to continue.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('My Tickets Screen')).not.toBeInTheDocument()
  })

  it('redirects user with mustChangePassword: false from /change-password to default role view', async () => {
    renderAppWithGuards('/change-password', {
      role: 'REQUESTER',
      mustChangePassword: false,
    })

    await waitFor(() => {
      expect(screen.getByText('My Tickets Screen')).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('heading', { name: 'Change Your Password' }),
    ).not.toBeInTheDocument()
  })
})

describe('UI-03 — Password change form checklist criteria validation (AC-03, BR-07)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('validates password criteria checklist dynamically in real-time', async () => {
    renderAppWithGuards('/change-password')

    await waitFor(() => {
      expect(screen.getByLabelText(/^Current Password/i)).toBeInTheDocument()
    })

    const newPasswordInput = screen.getByLabelText(/^New Password/i)
    const lenCrit = screen.getByTestId('criterion-length')
    const upperCrit = screen.getByTestId('criterion-uppercase')
    const lowerCrit = screen.getByTestId('criterion-lowercase')
    const digitCrit = screen.getByTestId('criterion-digit')
    const specialCrit = screen.getByTestId('criterion-special')

    // Initially none are satisfied
    expect(lenCrit).toHaveTextContent('○ At least 8 characters')
    expect(upperCrit).toHaveTextContent('○ At least one uppercase letter')
    expect(lowerCrit).toHaveTextContent('○ At least one lowercase letter')
    expect(digitCrit).toHaveTextContent('○ At least one numeric digit')
    expect(specialCrit).toHaveTextContent('○ At least one special character')

    // Type lowercase only: "abc"
    fireEvent.change(newPasswordInput, { target: { value: 'abc' } })
    expect(lowerCrit).toHaveTextContent('✓ At least one lowercase letter')
    expect(lenCrit).toHaveTextContent('○ At least 8 characters')

    // Add uppercase: "abcD"
    fireEvent.change(newPasswordInput, { target: { value: 'abcD' } })
    expect(upperCrit).toHaveTextContent('✓ At least one uppercase letter')

    // Add digit: "abcD1"
    fireEvent.change(newPasswordInput, { target: { value: 'abcD1' } })
    expect(digitCrit).toHaveTextContent('✓ At least one numeric digit')

    // Add special character: "abcD1!"
    fireEvent.change(newPasswordInput, { target: { value: 'abcD1!' } })
    expect(specialCrit).toHaveTextContent('✓ At least one special character')
    expect(lenCrit).toHaveTextContent('○ At least 8 characters')

    // Reach 8 characters: "abcD1!23"
    fireEvent.change(newPasswordInput, { target: { value: 'abcD1!23' } })
    expect(lenCrit).toHaveTextContent('✓ At least 8 characters')
    expect(upperCrit).toHaveTextContent('✓ At least one uppercase letter')
    expect(lowerCrit).toHaveTextContent('✓ At least one lowercase letter')
    expect(digitCrit).toHaveTextContent('✓ At least one numeric digit')
    expect(specialCrit).toHaveTextContent('✓ At least one special character')
  })

  it('validates password confirmation match and enables submit button only when compliant', async () => {
    renderAppWithGuards('/change-password')

    await waitFor(() => {
      expect(screen.getByLabelText(/^Current Password/i)).toBeInTheDocument()
    })

    const currentPasswordInput = screen.getByLabelText(/^Current Password/i)
    const newPasswordInput = screen.getByLabelText(/^New Password/i)
    const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password/i)
    const submitBtn = screen.getByRole('button', { name: /Continue/i })

    // Initially submit is disabled
    expect(submitBtn).toBeDisabled()

    // Fill current password
    fireEvent.change(currentPasswordInput, { target: { value: 'Temporary123!' } })
    expect(submitBtn).toBeDisabled()

    // Fill valid new password
    fireEvent.change(newPasswordInput, { target: { value: 'NewSecure456$' } })
    expect(submitBtn).toBeDisabled()

    // Fill mismatching confirmation
    fireEvent.change(confirmPasswordInput, { target: { value: 'Mismatch789#' } })
    expect(screen.getByTestId('password-mismatch')).toHaveTextContent('✕ Passwords do not match')
    expect(submitBtn).toBeDisabled()

    // Fill matching confirmation
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewSecure456$' } })
    expect(screen.getByTestId('password-match')).toHaveTextContent('✓ Passwords match')
    expect(submitBtn).not.toBeDisabled()

    // If newPassword === currentPassword, it should warn and remain disabled
    fireEvent.change(newPasswordInput, { target: { value: 'Temporary123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'Temporary123!' } })
    expect(screen.getByText('Must be different from current password')).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()
  })

  it('submits compliant password change and redirects to default view (AC-03)', async () => {
    renderAppWithGuards('/change-password')

    await waitFor(() => {
      expect(screen.getByLabelText(/^Current Password/i)).toBeInTheDocument()
    })

    const currentPasswordInput = screen.getByLabelText(/^Current Password/i)
    const newPasswordInput = screen.getByLabelText(/^New Password/i)
    const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password/i)
    const submitBtn = screen.getByRole('button', { name: /Continue/i })

    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword456$' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword456$' } })

    expect(submitBtn).not.toBeDisabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('My Tickets Screen')).toBeInTheDocument()
    })
  })
})
