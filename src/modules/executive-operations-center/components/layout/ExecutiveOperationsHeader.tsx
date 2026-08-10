interface ExecutiveOperationsHeaderProps {
  title: string
  eyebrow: string
  context: string
}

export function ExecutiveOperationsHeader({
  title,
  eyebrow,
  context,
}: ExecutiveOperationsHeaderProps) {
  return (
    <header className="eoc-header">
      <div className="eoc-header__copy">
        <span className="eoc-header__eyebrow">{eyebrow}</span>
        <h1 className="eoc-header__title">{title}</h1>
        <p className="eoc-header__context">{context}</p>
      </div>
      <div className="eoc-header__badge" aria-hidden="true">
        Fase 1
      </div>
    </header>
  )
}
