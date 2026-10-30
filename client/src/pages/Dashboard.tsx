import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import apiFetch from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Badge from "../components/Badge";
import { DashboardList } from "../components/DashboardList";
import { MetricCard } from "../components/MetricCard";
import StateBlock from "../components/StateBlock";
import type {
  RequesterDashboardData,
  StaffDashboardData,
} from "../types/dashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || "REQUESTER";
  const staff = role !== "REQUESTER";
  const [data, setData] = useState<
    RequesterDashboardData | StaffDashboardData | null
  >(null);
  const [state, setState] = useState<
    "loading" | "ready" | "error" | "forbidden"
  >("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setState("loading");
    apiFetch(`/api/dashboard/${staff ? "staff" : "requester"}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setState(response.status === 403 ? "forbidden" : "error");
          return;
        }
        const body = await response.json();
        if (!controller.signal.aborted) {
          setData(body);
          setState("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, [staff, role, user?.id, retry]);
  const reload = () => setRetry((value) => value + 1);
  const requesterData = data as RequesterDashboardData;
  const staffData = data as StaffDashboardData;
  const empty = staff
    ? "Nothing has changed recently."
    : "No Tickets yet. Create one when something needs IT.";
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3">
            {role === "REQUESTER"
              ? "My Dashboard"
              : role === "IT_STAFF"
                ? "Service Desk Dashboard"
                : "Administration Dashboard"}
          </h1>
          <p className="text-body-secondary mb-0">
            {staff
              ? "A quick look at the service desk."
              : "A quick look at your IT requests."}
          </p>
        </div>
        {role === "ADMINISTRATOR" && (
          <Link className="btn btn-outline-primary" to="/admin/users">
            Manage users →
          </Link>
        )}
      </div>
      {(state === "loading" || state === "error") && (
        <DashboardPending
          staff={staff}
          admin={role === "ADMINISTRATOR"}
          loading={state === "loading"}
          onRetry={reload}
        />
      )}
      {(state === "error" || state === "forbidden") && (
        <StateBlock
          variant="error"
          title="Dashboard unavailable"
          message={
            state === "forbidden"
              ? "You do not have access to this dashboard."
              : "Unable to load the dashboard. Please try again."
          }
          action={
            state === "error" ? (
              <button className="btn btn-primary" onClick={reload}>
                Try Again
              </button>
            ) : undefined
          }
        />
      )}
      {state === "ready" && data && (
        <>
          <div className="row g-3">
            {staff ? (
              <>
                <MetricCard
                  label="Unassigned"
                  value={staffData.unassigned}
                  to="/staff/queue?owner=unassigned"
                />
                <MetricCard
                  label="Owned by Me"
                  value={staffData.ownedByMe}
                  to="/staff/queue?owner=me"
                />
              </>
            ) : (
              <>
                <MetricCard
                  label="Open Tickets"
                  value={requesterData.openTickets}
                  to="/tickets?statusGroup=open"
                />
                <MetricCard
                  label="Waiting for You"
                  value={requesterData.waitingForRequester}
                  to="/tickets?status=WAITING_FOR_REQUESTER"
                />
              </>
            )}
          </div>
          {staff && (
            <>
              <h2 className="h5 mt-4 mb-3">By Status</h2>
              <div className="row g-3">
                {Object.entries(staffData.byStatus).map(([status, value]) => (
                  <MetricCard
                    key={status}
                    label={status.replaceAll("_", " ")}
                    badge={
                      <Badge
                        value={status as keyof typeof staffData.byStatus}
                      />
                    }
                    value={value}
                    to={`/staff/queue?status=${status}`}
                  />
                ))}
              </div>
              <h2 className="h5 mt-4 mb-3">By IT Priority</h2>
              <div className="row g-3">
                {Object.entries(staffData.byPriority).map(
                  ([priority, value]) => (
                    <MetricCard
                      key={priority}
                      label={priority}
                      badge={
                        <Badge
                          value={priority as keyof typeof staffData.byPriority}
                        />
                      }
                      value={value}
                      to={`/staff/queue?priority=${priority}`}
                    />
                  ),
                )}
              </div>
            </>
          )}
          <DashboardList
            title="Recently Updated"
            tickets={data.recentlyUpdated}
            staff={staff}
            to={
              staff
                ? "/staff/queue?sortBy=updatedAt&sortOrder=desc"
                : "/tickets?sort=updatedAt&order=desc"
            }
            empty={
              staff && data.recentlyUpdated.length === 0
                ? "The queue is empty. Nothing needs IT right now."
                : empty
            }
          />
          {!staff && (
            <>
              <DashboardList
                title="Recently Resolved"
                tickets={requesterData.recentlyResolved}
                staff={false}
                to="/tickets?statusGroup=resolved&sort=updatedAt&order=desc"
                empty={empty}
              />
              {data.recentlyUpdated.length === 0 && (
                <Link to="/tickets/new" className="btn btn-primary mt-4">
                  Create Ticket
                </Link>
              )}
            </>
          )}
          {role === "ADMINISTRATOR" && (
            <section aria-label="Accounts">
              <h2 className="h5 mt-4 mb-3">Accounts</h2>
              {staffData.userCounts ? (
                <div className="row g-3">
                  <MetricCard
                    label="Total"
                    value={staffData.userCounts.total}
                    to="/admin/users"
                  />
                  <MetricCard
                    label="Active"
                    value={staffData.userCounts.active}
                  />
                  <MetricCard
                    label="Inactive"
                    value={staffData.userCounts.inactive}
                  />
                  {Object.entries(staffData.userCounts.byRole).map(
                    ([accountRole, value]) => (
                      <MetricCard
                        key={accountRole}
                        label={accountRole.replaceAll("_", " ")}
                        value={value}
                        to={`/admin/users?role=${accountRole}`}
                      />
                    ),
                  )}
                </div>
              ) : (
                <StateBlock
                  variant="error"
                  title="Accounts unavailable"
                  message="Account counts are unavailable. Ticket metrics remain available."
                  action={
                    <button className="btn btn-primary" onClick={reload}>
                      Try Again
                    </button>
                  }
                />
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}

function DashboardPending({
  staff,
  admin,
  loading,
  onRetry,
}: {
  staff: boolean;
  admin: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  const card = (label: string) => (
    <MetricCard
      key={label}
      label={label}
      loading={loading}
      onRetry={loading ? undefined : onRetry}
    />
  );
  const group = (title: string, labels: string[]) => (
    <section aria-label={title}>
      <h2 className="h5 mt-4 mb-3">{title}</h2>
      <div className="row g-3">{labels.map(card)}</div>
    </section>
  );
  const list = (title: string) => (
    <section className="card mt-4" aria-label={title}>
      <div className="p-4 d-flex justify-content-between align-items-center">
        <h2 className="h5 mb-0">{title}</h2>
      </div>
      {loading ? (
        <ul className="list-group list-group-flush" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <li className="list-group-item p-4 placeholder-glow" key={i}>
              <span className="placeholder col-8 mb-2" />
              <br />
              <span className="placeholder col-6" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-4 mb-0">Unavailable</p>
      )}
    </section>
  );
  return (
    <div
      role={loading ? "status" : undefined}
      aria-label={
        loading ? "Loading dashboard" : "Unavailable dashboard metrics"
      }
      aria-busy={loading}
    >
      <div className="row g-3">
        {(staff
          ? ["Unassigned", "Owned by Me"]
          : ["Open Tickets", "Waiting for You"]
        ).map(card)}
      </div>
      {staff && (
        <>
          {group("By Status", [
            "New",
            "Open",
            "In Progress",
            "Waiting for Requester",
            "Resolved",
            "Closed",
            "Reopened",
            "Cancelled",
          ])}
          {group("By IT Priority", ["Low", "Medium", "High", "Critical"])}
        </>
      )}
      {list("Recently Updated")}
      {!staff && list("Recently Resolved")}
      {admin &&
        group("Accounts", [
          "Total",
          "Active",
          "Inactive",
          "Requester",
          "IT Staff",
          "Administrator",
        ])}
    </div>
  );
}
