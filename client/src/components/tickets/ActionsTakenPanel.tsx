import { useCallback, useEffect, useRef, useState } from "react";
import apiFetch from "../../api/client";
import type { ActionTakenDto } from "../../types/ticket";
import ActionEditor, { actionDateTime } from "./ActionEditor";
import StateBlock from "../StateBlock";

export interface ActionsTakenPanelProps {
  ticketId: number;
  version?: number;
  canWrite?: boolean;
  disabled?: boolean;
  onVersionChange?: (version: number) => void;
  onCountChange?: (count: number) => void;
  onReload?: () => Promise<void>;
}

export default function ActionsTakenPanel({
  ticketId,
  version,
  canWrite = false,
  disabled,
  onVersionChange,
  onCountChange,
  onReload,
}: ActionsTakenPanelProps) {
  const [editor, setEditor] = useState<ActionTakenDto | null | undefined>(
    undefined,
  );
  const [success, setSuccess] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const recordButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const closeEditor = () => {
    restoreFocus.current = true;
    setEditor(undefined);
  };
  useEffect(() => {
    if (editor === undefined && restoreFocus.current) {
      (trigger.current?.isConnected
        ? trigger.current
        : recordButton.current
      )?.focus();
      restoreFocus.current = false;
    }
  }, [editor]);
  const openEditor = (
    action: ActionTakenDto | null,
    button: HTMLButtonElement,
  ) => {
    trigger.current = button;
    setSuccess(false);
    setEditor(action);
  };
  const [actions, setActions] = useState<ActionTakenDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(
    async (refresh = false) => {
      if (!refresh) setLoading(true);
      setError(null);
      setUnavailable(false);
      try {
        const res = await apiFetch(`/api/tickets/${ticketId}/actions`);
        if (res.status === 403 || res.status === 404) {
          setUnavailable(true);
          return;
        }
        if (!res.ok) throw new Error("Unable to load Actions Taken.");
        const data: ActionTakenDto[] = await res.json();
        if (!Array.isArray(data))
          throw new Error("Invalid Actions Taken response.");
        setActions(data);
        onCountChange?.(data.length);
      } catch {
        setError("Unable to load Actions Taken. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [ticketId, onCountChange],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const followUp = (action: ActionTakenDto) =>
    action.followUpRequired ? (
      <>
        <span className="badge bg-warning-subtle text-warning-emphasis">
          Required
        </span>
        <p className="mb-0 actions-text">{action.followUpNote}</p>
      </>
    ) : (
      "—"
    );
  const notes = (action: ActionTakenDto) =>
    action.attachmentNotes ? (
      <details>
        <summary className="text-truncate" title={action.attachmentNotes}>
          {action.attachmentNotes}
        </summary>
        <p className="actions-text mb-0">{action.attachmentNotes}</p>
      </details>
    ) : (
      "—"
    );
  const editButton = (action: ActionTakenDto) =>
    canWrite && (
      <button
        type="button"
        className="btn btn-outline-primary"
        disabled={disabled || editor !== undefined}
        onClick={(e) => openEditor(action, e.currentTarget)}
      >
        Edit
      </button>
    );
  return (
    <section aria-label="Actions Taken" className="actions-taken">
      {success && (
        <div role="status" className="alert alert-success">
          Action saved.
        </div>
      )}
      {canWrite &&
        editor === undefined &&
        !loading &&
        !error &&
        !unavailable && (
          <button
            type="button"
            className="btn btn-primary mb-3"
            ref={recordButton}
            disabled={disabled}
            onClick={(e) => openEditor(null, e.currentTarget)}
          >
            Record Action
          </button>
        )}
      {canWrite && editor !== undefined && version !== undefined && (
        <ActionEditor
          ticketId={ticketId}
          version={version}
          action={editor}
          disabled={disabled}
          onCancel={closeEditor}
          onReload={
            onReload
              ? async () => {
                  await onReload();
                  await load(true);
                }
              : undefined
          }
          onSaved={(newVersion) => {
            onVersionChange?.(newVersion);
            closeEditor();
            setSuccess(true);
            void load(true);
          }}
        />
      )}
      {loading && (
        <StateBlock variant="loading" message="Loading Actions Taken…" />
      )}
      {unavailable && (
        <p className="text-body-secondary">Actions Taken are unavailable.</p>
      )}
      {error && (
        <StateBlock
          variant="error"
          title="Actions Taken unavailable"
          message={error}
          onRetry={() => void load()}
        />
      )}
      {!loading &&
        !error &&
        !unavailable &&
        (actions.length === 0 ? (
          <StateBlock
            variant="empty"
            title="No Actions Taken"
            message={
              canWrite
                ? "No Actions Taken yet. Record the first action to start the work log."
                : "IT has not recorded any actions yet."
            }
          />
        ) : (
          <>
            {canWrite && (
              <div className="d-none d-md-block">
                <table className="table align-middle actions-table">
                  <caption className="visually-hidden">
                    Actions Taken, oldest first
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Action Date/Time",
                        "Description",
                        "Result",
                        "Performed by",
                        "Follow-Up",
                        "Attachment Notes",
                        "Actions",
                      ].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((action) => (
                      <tr key={action.id}>
                        <td>
                          <time dateTime={action.createdAt}>
                            {actionDateTime(action.createdAt)}
                          </time>
                        </td>
                        <td className="actions-text">
                          {action.description}
                        </td>
                        <td className="actions-text">
                          {action.result}
                        </td>
                        <td>{action.performedBy.name}</td>
                        <td>{followUp(action)}</td>
                        <td>{notes(action)}</td>
                        <td>{editButton(action)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ol
              className={`list-unstyled flex-column gap-3 ${canWrite ? "d-flex d-md-none" : "d-flex"}`}
            >
              {actions.map((action) => (
                <li key={action.id} className="border rounded p-3 text-break">
                  <h3 className="h6">
                    <span className="visually-hidden">Action Date/Time: </span>
                    <time dateTime={action.createdAt}>
                      {actionDateTime(action.createdAt)}
                    </time>
                  </h3>
                  <dl>
                    <dt>Description</dt>
                    <dd className="actions-text">
                      {action.description}
                    </dd>
                    <dt>Result</dt>
                    <dd className="actions-text">{action.result}</dd>
                    <dt>Performed by</dt>
                    <dd>{action.performedBy.name}</dd>
                    <dt>Follow-Up</dt>
                    <dd>{followUp(action)}</dd>
                    <dt>Attachment Notes</dt>
                    <dd>{action.attachmentNotes || "—"}</dd>
                  </dl>
                  {editButton(action)}
                </li>
              ))}
            </ol>
          </>
        ))}
    </section>
  );
}
