# Centro Operacional Ejecutivo

Experiencia institucional de NOVEX para los roles `ADMIN`, `DIRECTOR` y
`ANALISTA`. Su objetivo es explicar el estado completo de lo registrado en la
plataforma sin obligar al usuario a reconstruirlo entre módulos.

## Arquitectura de información

| Ruta | Pregunta que responde |
| --- | --- |
| `/centro-operacional` | ¿Qué exige atención ahora y qué tan completa es la trazabilidad? |
| `/centro-operacional/panorama` | ¿Qué se ha registrado, en qué estado está y dónde se concentra? |
| `/centro-operacional/inteligencia` | ¿Qué concluyó la IA, con qué confianza y dónde faltan datos? |
| `/centro-operacional/reportes` | ¿Quién registró o cambió qué, cuándo y con qué soportes? |

La etiqueta visible de la última ruta es **Auditoría**. Se conserva el segmento
`reportes` para no romper enlaces existentes.

## Datos

`loadOperationalCenterData` consulta todas las páginas de situaciones y cruza,
por expediente:

- autor, responsable, coordinación, categoría, estado y fechas;
- análisis IA vigente e historial de versiones;
- recomendaciones y estado de ejecución;
- coordinaciones afectadas;
- línea de tiempo y evidencias.

Las consultas de detalle son tolerantes a fallos. Una fuente secundaria que no
responde no elimina el tablero: el centro conserva la lectura principal,
reporta cuántas fuentes quedaron incompletas y deja los campos afectados sin
información.

El `ExecutiveOperationsProvider` carga una sola consolidación que se comparte
entre pestañas. El botón **Actualizar** vuelve a consultar todas las fuentes.

## Decisiones de UX

- Inicio prioriza conclusión, decisión y cobertura; no repite el inventario.
- Panorama usa distribuciones, tendencia de 14 días y estado por coordinación.
- Inteligencia diferencia severidad declarada de clasificación IA y expone
  proveedor, modelo, confianza, versiones, riesgos y datos faltantes.
- Auditoría ofrece filtros, exportación CSV y acceso al expediente completo.
- El scroll interno vuelve al inicio en cada cambio de pestaña.
- Todos los estados incluyen carga, vacío, error y degradación parcial.

## Seguridad y navegación

Las rutas están protegidas con `RequireRoleRoute` para `ADMIN`, `DIRECTOR` y
`ANALISTA`. El coordinador conserva su experiencia operativa y no ve este
centro en la navegación principal.

## Verificación

La prueba `e2e/executive-operations-center.spec.ts` valida las cuatro pestañas,
la ausencia de placeholders, la información IA, la auditoría y la restauración
del viewport al navegar.
