import { Link } from "react-router-dom";
import type { DashboardTicket } from "../types/dashboard";
import Badge from "./Badge";

function relativeTime(iso: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}
export function DashboardList({
  title,
  tickets,
  to,
  staff,
  empty,
}: {
  title: string;
  tickets: DashboardTicket[];
  to: string;
  staff: boolean;
  empty: string;
}) {
  return (
    <section className="card mt-4" aria-label={title}>
      <div className="p-4 d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <h2 className="h5 mb-0">{title}</h2>
        <Link className="btn btn-link px-0" to={to}>
          View all {title.toLowerCase()} Tickets
        </Link>
      </div>
      {tickets.length === 0 ? (
        <p className="px-4 pb-4 text-body-secondary mb-0">{empty}</p>
      ) : (
        <ul className="list-group list-group-flush">
          {tickets.map((ticket) => (
            <li className="list-group-item p-0" key={ticket.id}>
              <Link
                to={`${staff ? "/staff/tickets" : "/tickets"}/${ticket.id}`}
                className="d-flex flex-column flex-md-row gap-3 p-4 text-decoration-none text-body align-items-md-center"
              >
                <div className="flex-grow-1 overflow-hidden">
                  <span className="small fw-semibold">
                    {ticket.ticketNumber}
                  </span>
                  <div className="text-truncate" title={ticket.summary}>
                    {ticket.summary}
                  </div>
                  {staff && (
                    <span className="small text-body-secondary">
                      {ticket.owner?.name || "Unassigned"}
                    </span>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <Badge value={ticket.status} />
                  <Badge value={ticket.itPriority} />
                  <time
                    className="small text-body-secondary"
                    dateTime={ticket.updatedAt}
                    title={new Date(ticket.updatedAt).toLocaleString()}
                  >
                    {relativeTime(ticket.updatedAt)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
