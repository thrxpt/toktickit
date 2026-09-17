import { Link, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import AppShell from "./components/AppShell";
import RequesterGuard from "./components/RequesterGuard";
import { RequesterProvider } from "./context/RequesterContext";
import ChangePassword from "./pages/ChangePassword";
import CheckSystem from "./pages/CheckSystem";
import CreateTicket from "./pages/CreateTicket";
import Login from "./pages/Login";
import MyTickets from "./pages/MyTickets";
import RequesterSelection from "./pages/RequesterSelection";
import RequesterTicketDetail from "./pages/RequesterTicketDetail";
import { RequirePasswordChange } from "./routes/RequirePasswordChange";
import { RequireRole } from "./routes/RequireRole";

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
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirects to /tickets */}
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      {/* Authentication screens (Lab 3) */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/change-password"
        element={
          <RequirePasswordChange>
            <ChangePassword />
          </RequirePasswordChange>
        }
      />

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
              <MyTickets />
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
                { label: "My Tickets", to: "/tickets" },
                { label: "Ticket Details" },
              ]}
            >
              <RequesterTicketDetail />
            </AppShell>
          </RequesterGuard>
        }
      />

      {/* Staff & Admin Routes (Lab 3) */}
      <Route
        path="/staff/queue"
        element={
          <RequireRole roles={["IT_STAFF", "ADMINISTRATOR"]}>
            <AppShell>
              <div className="container py-4">
                <h2>Ticket Queue</h2>
                <p className="text-muted">
                  Staff ticket queue will be available in Issue 17.
                </p>
              </div>
            </AppShell>
          </RequireRole>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireRole roles={["ADMINISTRATOR"]}>
            <AppShell>
              <div className="container py-4">
                <h2>User Management</h2>
                <p className="text-muted">
                  Administrator user management will be available in Issue 20.
                </p>
              </div>
            </AppShell>
          </RequireRole>
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
  );
}

export function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AppRoutes />
      </RequesterProvider>
    </AuthProvider>
  );
}

export default App;
