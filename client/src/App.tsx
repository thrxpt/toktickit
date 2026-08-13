/**
 * Lab 1, Issue 1 — the page shell only.
 *
 * [Check System] is deliberately disabled: Issue 2 wires it to GET /api/health
 * and Issue 4 adds the category list, loading, and error states. A disabled
 * button says "not built yet" honestly, rather than looking broken on click.
 */
function App() {
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

                <button type="button" className="btn btn-primary btn-lg" disabled>
                  Check System
                </button>

                <p className="form-text mt-3 mb-0">
                  Wiring lands in Issue 2 (system status) and Issue 4 (request categories).
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default App
