import type { ProblemCategoryId } from '@/modules/impact-network/data/executive-operational-overview.mock'

/** Iconos SVG inline (sin lucide) alineados al lenguaje visual NOVEX. */
export function ProblemCategoryGlyph({
  categoryId,
  size = 14,
}: {
  categoryId: ProblemCategoryId
  size?: number
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (categoryId) {
    case 'connectivity':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      )
    case 'platforms':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      )
    case 'staff':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.6" />
          <path d="M3.8 19c.6-2.6 2.3-3.9 5.2-3.9" />
          <circle cx="16" cy="8.5" r="2.2" />
          <path d="M12.8 19c.5-2.2 2-3.4 4.4-3.4 2.3 0 3.9 1.2 4.4 3.4" />
        </svg>
      )
    case 'processes':
      return (
        <svg {...common}>
          <path d="M4 6h10M4 12h16M4 18h12" />
          <circle cx="17" cy="6" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      )
    case 'infrastructure':
      return (
        <svg {...common}>
          <path d="M4 20V8l8-4v16M12 10h8v10M2 20h20" />
        </svg>
      )
    case 'documentation':
      return (
        <svg {...common}>
          <path d="M6 3.5h8l4 4v13H6z" />
          <path d="M14 3.5v4h4M9 12h6M9 15.5h5" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}
