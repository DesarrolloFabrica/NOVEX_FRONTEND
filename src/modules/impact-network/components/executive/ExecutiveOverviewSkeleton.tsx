const METRIC_KEYS = ['attention', 'coordinations', 'situations', 'risk'] as const
const LANE_COUNTS = [
  { status: 'critical', count: 2 },
  { status: 'high', count: 6 },
  { status: 'attention', count: 3 },
  { status: 'normal', count: 3 },
] as const

export function ExecutiveOverviewSkeleton() {
  return (
    <>
      <section
        className="impact-executive__metrics impact-executive__metrics--skeleton"
        aria-hidden="true"
      >
        {METRIC_KEYS.map((key) => (
          <article
            key={key}
            className="impact-executive__metric impact-executive__skeleton-card"
            data-metric={key}
          >
            <span className="impact-executive__skeleton-icon" />
            <span className="impact-executive__skeleton-copy">
              <i />
              <b />
              <i />
            </span>
          </article>
        ))}
      </section>

      <div className="impact-executive__body">
        <div
          className="impact-executive__skeleton-board"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="impact-executive__skeleton-pulse" />
          <div className="impact-executive__skeleton-lanes">
            {LANE_COUNTS.map((lane) => (
              <section
                key={lane.status}
                className="impact-status-group"
                data-status={lane.status}
              >
                <header className="impact-status-group__header">
                  <span className="impact-executive__skeleton-lane-title" />
                </header>
                <div className="impact-executive__skeleton-islands">
                  {Array.from({ length: lane.count }, (_, index) => (
                    <span
                      key={`${lane.status}-${index}`}
                      className="impact-executive__skeleton-island"
                      style={{ animationDelay: `${index * 70}ms` }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p>Organizando el estado de las coordinaciones…</p>
        </div>

        <aside className="impact-executive__rail impact-executive__rail--skeleton" aria-hidden="true">
          <div className="impact-executive__panel">
            <span className="impact-executive__skeleton-kicker" />
            <span className="impact-executive__skeleton-heading" />
            <ul className="impact-executive__skeleton-list">
              <li />
              <li />
              <li />
            </ul>
          </div>
          <div className="impact-executive__panel">
            <span className="impact-executive__skeleton-kicker" />
            <span className="impact-executive__skeleton-heading" />
            <span className="impact-executive__skeleton-bar" />
            <span className="impact-executive__skeleton-bar" />
          </div>
        </aside>
      </div>
    </>
  )
}
