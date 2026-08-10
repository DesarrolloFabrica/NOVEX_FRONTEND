import type { ReactNode } from 'react'

interface ExecutiveHomeSectionProps {
  id: string
  eyebrow: string
  title: string
  integrationNote: string
  children: ReactNode
  variant?: 'default' | 'hero' | 'compact'
  action?: ReactNode
}

export function ExecutiveHomeSection({
  id,
  eyebrow,
  title,
  children,
  variant = 'default',
  action,
}: ExecutiveHomeSectionProps) {
  return (
    <section
      id={id}
      className={`eoc-section eoc-section--${variant}`}
      aria-labelledby={`${id}-title`}
    >
      <header className="eoc-section__header">
        <div className="eoc-section__heading">
          <span className="eoc-section__eyebrow">{eyebrow}</span>
          <h2 id={`${id}-title`} className="eoc-section__title">
            {title}
          </h2>
        </div>
        {action ? <div className="eoc-section__action">{action}</div> : null}
      </header>
      <div className="eoc-section__body">{children}</div>
    </section>
  )
}
