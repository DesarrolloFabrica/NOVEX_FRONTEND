import type { IncidentCategoryIcon } from '@/modules/situations/data/incident-category-visual'

/** Iconos SVG inline (sin lucide) alineados al lenguaje visual NOVEX. */
export function ProblemCategoryGlyph({
  categoryId,
  size = 14,
}: {
  categoryId: IncidentCategoryIcon
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
    case 'internet':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      )
    case 'apps':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      )
    case 'devices':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="12" rx="1.5" />
          <path d="M9 20h6M12 16v4" />
        </svg>
      )
    case 'zoho':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 12.5h5" />
        </svg>
      )
    case 'iceberg':
      return (
        <svg {...common}>
          <path d="M4 14h16l-4 6H8z" />
          <path d="M7 14 12 5l5 9" />
        </svg>
      )
    case 'acas':
      return (
        <svg {...common}>
          <path d="M4 18V8l8-4 8 4v10" />
          <path d="M9 18v-5h6v5" />
        </svg>
      )
    case 'diplomas':
      return (
        <svg {...common}>
          <path d="M4 7.5 12 4l8 3.5-8 3.5z" />
          <path d="M7 10.5v4.2c0 1.6 2.2 2.8 5 2.8s5-1.2 5-2.8v-4.2" />
        </svg>
      )
    case 'tickets':
      return (
        <svg {...common}>
          <path d="M5 7h14v4a2 2 0 0 1 0 4v4H5v-4a2 2 0 0 1 0-4z" />
          <path d="M9 10h6M9 14h4" />
        </svg>
      )
    case 'infrastructure':
      return (
        <svg {...common}>
          <path d="M4 20V8l8-4v16M12 10h8v10M2 20h20" />
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
