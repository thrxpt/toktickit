import { useState } from 'react'

type CheckState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'online' }
  | { phase: 'offline'; message: string }

/**
 * Lab 1, Issue 2 — [Check System] now calls GET /api/health and renders
 * System Status from it. Issue 4 adds the Request Categories call; once that
 * lands, System Status must also reflect its outcome (see CONTEXT.md — System
 * Status is the verdict on the whole flow, not a mirror of Health alone).
 */
function App() {
  const [state, setState] = useState<CheckState>({ phase: 'idle' })

  async function checkSystem() {
    setState({ phase: 'loading' })

    try {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('non-200 response')

      const body = await response.json()
      if (body.status !== 'ok') throw new Error('unexpected response body')

      setState({ phase: 'online' })
    } catch {
      setState({ phase: 'offline', message: 'Unable to connect to TokTickIT API' })
    }
  }

  return (
    <>
      <nav className="navbar navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand mb-0 h1">TokTickIT</span>
          <span className="navbar-text">IT Service Desk</span>
        </div>
      </nav>

      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h1 className="card-title h3 mb-3">TokTickIT</h1>
                <p className="text-body-secondary mb-4">
                  Check that the TokTickIT API and its request categories are available.
                </p>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={checkSystem}
                  disabled={state.phase === 'loading'}
                >
                  {state.phase === 'loading' ? 'Checking…' : 'Check System'}
                </button>

                {state.phase === 'online' && (
                  <p className="mt-3 mb-0">System Status: Online</p>
                )}

                {state.phase === 'offline' && (
                  <>
                    <p className="mt-3 mb-0">System Status: Offline</p>
                    <p className="text-danger mb-0">{state.message}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default App
