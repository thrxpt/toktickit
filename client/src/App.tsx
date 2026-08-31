import { Link, Navigate, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell'
import RequesterGuard from './components/RequesterGuard'
import { RequesterProvider } from './context/RequesterContext'
import CheckSystem from './pages/CheckSystem'
import CreateTicket from './pages/CreateTicket'
import RequesterSelection from './pages/RequesterSelection'

function PlaceholderPage({
  title,
  issueNumber,
}: {
  title: string
  issueNumber: number
}) {
  return (
    <div className="card text-center py-5">
      <div className="card-body">
        <h1 className="h3 mb-2">{title}</h1>
        <p className="text-body-secondary mb-0">
          Coming in Issue {issueNumber}
        </p>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="card text-center py-5">
      <div className="card-body">
        <h1 className="h3 mb-2">Page Not Found</h1>
        <p className="text-body-secondary mb-4">
          The requested page does not exist.
        </p>
        <Link to="/tickets" className="btn btn-primary">
          Go to My Tickets
        </Link>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirects to /tickets */}
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      {/* Lab 2 Development Requester Selection (Issue 8) */}
      <Route
        path="/select-requester"
        element={
          <AppShell>
            <RequesterSelection />
          </AppShell>
        }
      />

      {/* Guarded Ticket Routes (FR-04, AC-02) */}
      <Route
        path="/tickets"
        element={
          <RequesterGuard>
            <AppShell>
              <PlaceholderPage title="My Tickets" issueNumber={10} />
            </AppShell>
          </RequesterGuard>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <RequesterGuard>
            <AppShell>
              <CreateTicket />
            </AppShell>
          </RequesterGuard>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RequesterGuard>
            <AppShell
              breadcrumbs={[
                { label: 'My Tickets', to: '/tickets' },
                { label: 'Ticket Details' },
              ]}
            >
              <PlaceholderPage title="Ticket Details" issueNumber={11} />
            </AppShell>
          </RequesterGuard>
        }
      />

      {/* Lab 1 diagnostic screen */}
      <Route
        path="/system"
        element={
          <AppShell>
            <CheckSystem />
          </AppShell>
        }
      />

      {/* Not-found route */}
      <Route
        path="*"
        element={
          <AppShell>
            <NotFoundPage />
          </AppShell>
        }
      />
    </Routes>
  )
}

export function App() {
  return (
    <RequesterProvider>
      <AppRoutes />
    </RequesterProvider>
  )
}

export default App
