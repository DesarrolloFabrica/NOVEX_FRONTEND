import { useState } from 'react'

/**
 * Marca lateral de una fila: el logo de la coordinación representada o, si no
 * se pudo resolver, un marcador NEUTRO.
 *
 * Es decorativa: la coordinación viaja en el texto visible de la fila y en su
 * nombre accesible, así que el logo solo acelera el reconocimiento. Si la
 * imagen no carga, cae al marcador neutro; nunca al logo de otra coordinación.
 */
export function CoordinationMark({
  asset,
  code,
  className,
}: {
  asset: string | null
  code: string | null
  className: string
}) {
  const [failedAsset, setFailedAsset] = useState<string | null>(null)
  const showLogo = asset !== null && failedAsset !== asset

  return (
    <span
      className={className}
      data-testid="coordination-mark"
      data-mark={showLogo ? 'logo' : 'neutral'}
      data-mark-code={code ?? undefined}
      aria-hidden="true"
    >
      {showLogo ? (
        <img
          src={asset}
          alt=""
          decoding="async"
          draggable={false}
          onError={() => setFailedAsset(asset)}
        />
      ) : null}
    </span>
  )
}
