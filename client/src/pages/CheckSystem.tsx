import { useState } from 'react'

type Category = { id: number; name: string }

type CheckState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'online'; categories: Category[] }
  | { phase: 'offline'; message: string }

/**
 * Lab 1, Issue 4 — [Check System] now calls both GET /api/health and
 * GET /api/categories. System Status is the verdict on the whole flow (see
 * CONTEXT.md): either call failing takes the page Offline, each with a
 * message naming what failed.
 */
export function CheckSystem() {
  const [state, setState] = useState<CheckState>({ phase: 'idle' })

  async function checkSystem() {
    setState({ phase: 'loading' })

    const [health, categories] = await Promise.allSettled([
      fetch('/api/health').then(async (response) => {
        if (!response.ok) throw new Error('non-200 response')
        const body = await response.json()
        if (body.status !== 'ok') throw new Error('unexpected response body')
      }),
      fetch('/api/categories').then(async (response) => {
        if (!response.ok) throw new Error('non-200 response')
        return (await response.json()) as Category[]
      }),
    ])

    if (health.status === 'rejected') {
      setState({ phase: 'offline', message: 'Unable to connect to TokTickIT API' })
      return
    }

    if (categories.status === 'rejected') {
      setState({ phase: 'offline', message: 'Unable to load Request Categories' })
      return
    }

    setState({ phase: 'online', categories: categories.value })
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
                  <>
                    <p className="mt-3 mb-0">System Status: Online</p>
                    <p className="mt-3 mb-1">Supported Request Categories:</p>
                    <ol className="mb-0">
                      {state.categories.map((category) => (
                        <li key={category.id}>{category.name}</li>
                      ))}
                    </ol>
                  </>
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

export default CheckSystem
