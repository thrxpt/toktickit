import { Link, Navigate, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell'
import CheckSystem from './pages/CheckSystem'

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
        <p className="text-body-secondary mb-0">Coming in Issue {issueNumber}</p>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="card text-center py-5">
      <div className="card-body">
        <h1 className="h3 mb-2">Page Not Found</h1>
        <p className="text-body-secondary mb-4">The requested page does not exist.</p>
        <Link to="/tickets" className="btn btn-primary">
          Go to My Tickets
        </Link>
      </div>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      {/* Root redirects to /tickets */}
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      {/* Lab 2 screens (placeholders in Issue 7) */}
      <Route
        path="/select-requester"
        element={
          <AppShell>
            <PlaceholderPage
              title="Select Development Requester"
              issueNumber={8}
            />
          </AppShell>
        }
      />
      <Route
        path="/tickets"
        element={
          <AppShell>
            <PlaceholderPage title="My Tickets" issueNumber={10} />
          </AppShell>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <AppShell>
            <PlaceholderPage title="Create Ticket" issueNumber={9} />
          </AppShell>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <AppShell
            breadcrumbs={[
              { label: 'My Tickets', to: '/tickets' },
              { label: 'Ticket Details' },
            ]}
          >
            <PlaceholderPage title="Ticket Details" issueNumber={11} />
          </AppShell>
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

export default App
