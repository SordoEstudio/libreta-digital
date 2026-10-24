# Cierre Granular por Curso — Diseño

**Fecha:** 2026-10-24  
**Estado:** Aprobado

## Problema

`periodos.cerrado_at` y `periodos.publicado_at` son flags de toda la institución. Cerrar/publicar un período bloquea o expone notas de *todos* los cursos simultáneamente.

Dos casos reales del primer tenant:

1. **Cierre anticipado**: algunos cursos terminan antes de vacaciones de invierno → necesitan notas cerradas y publicadas mientras otros cursos siguen trabajando.
2. **Corrección de error**: se detecta un error en un curso después de publicar → necesita despublicarse/reabrirse solo ese curso sin afectar a los demás.

## Diseño

### Granularidad elegida: por curso dentro del período

- "Grupos que rinden antes" = cursos concretos (no materias individuales, no docentes).
- El boletín se genera por alumno/curso → la unidad de publicación natural es el curso.
- Granularidad por materia sería demasiado operativa para el admin.

### Regla de estado resultante

El estado real de un curso en un período se resuelve así:

| `periodos.cerrado_at` | `pcc.abierto_at` | `pcc.cerrado_at` | ¿Cerrado? |
|---|---|---|---|
| NULL | — | — | No |
| NOT NULL | NULL | NULL | **Sí** (heredado) |
| NOT NULL | NOT NULL | — | **No** (reabierto explícito) |
| NULL | NULL | NOT NULL | **Sí** (cierre anticipado) |
| NOT NULL | NULL | NOT NULL | Sí |

Para `publicado_at`: misma lógica reemplazando `cerrado_at` → `publicado_at` (y `abierto_at` despublica también).

### Nueva tabla: `periodo_cierre_cursos`

```sql
CREATE TABLE periodo_cierre_cursos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id    UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  curso_id      UUID NOT NULL REFERENCES cursos(id)  ON DELETE CASCADE,
  cerrado_at    TIMESTAMPTZ,     -- cierre específico de este curso
  publicado_at  TIMESTAMPTZ,     -- publicación específica de este curso
  abierto_at    TIMESTAMPTZ,     -- reapertura explícita (override del global)
  UNIQUE(periodo_id, curso_id)
);
CREATE INDEX ON periodo_cierre_cursos(periodo_id);
CREATE INDEX ON periodo_cierre_cursos(curso_id);
```

**Sin cambios** en `periodos`: `cerrado_at` y `publicado_at` siguen siendo el estado global/fallback.

### Helper en `src/lib/cierre-periodo.ts`

```typescript
export type PeriodoCierreOverride = {
  cerrado_at:   string | null
  publicado_at: string | null
  abierto_at:   string | null
} | null

export function isCerradoParaCurso(
  periodoCerradoAt: string | null,
  override: PeriodoCierreOverride
): boolean

export function isPublicadoParaCurso(
  periodoPublicadoAt: string | null,
  override: PeriodoCierreOverride
): boolean
```

### Nuevas rutas API

Todas bajo `/api/v1/instituciones/[id]/periodos/[periodo_id]/cursos/[curso_id]/`:
- `POST .../cerrar`
- `POST .../publicar`
- `POST .../reabrir`
- `POST .../despublicar`

Misma auth: admin o superadmin de la institución.

### Rutas existentes modificadas

| Ruta | Cambio |
|---|---|
| `POST /periodos/:id/cerrar` | Upserta filas en `periodo_cierre_cursos` para todos los cursos del año |
| `POST /periodos/:id/publicar` | Upserta `publicado_at` en todas las filas del período |
| `POST /periodos/:id/reabrir` | Elimina todas las filas del período + limpia period-level |
| `POST /periodos/:id/despublicar` | Nullifica `publicado_at` en filas del período + period-level |

### Puntos de control de escritura actualizados

Cada ruta que hoy hace `isPeriodoCerrado(periodo?.cerrado_at)` pasa a:

```typescript
// 1. Fetch período (igual que antes)
const { data: periodo } = await supabase.from('periodos').select('cerrado_at')...
// 2. Fetch override (nuevo — una query extra)
const { data: override } = await supabase
  .from('periodo_cierre_cursos')
  .select('cerrado_at, publicado_at, abierto_at')
  .eq('periodo_id', periodo_id)
  .eq('curso_id', curso_id)
  .maybeSingle()
// 3. Check combinado
if (isCerradoParaCurso(periodo?.cerrado_at ?? null, override)) return Err.conflict('Período cerrado')
```

Rutas afectadas: `notas/bulk`, `notas/[id]`, `evaluaciones/[id]` (PATCH), `materias/[id]/evaluaciones` (POST), `materias/[id]/asistencia` (POST).

**Cómo obtener `curso_id` en cada ruta:**
- `notas/bulk`: `evaluacion.materias(curso_id)` — ya tiene el join, agregar `curso_id`
- `notas/[id]`: join `evaluaciones → materias(curso_id)` en la query inicial
- `evaluaciones/[id]` PATCH: `evaluacion.materias` ya trae `curso_id`
- `materias/[id]/evaluaciones` POST: `materia.curso_id` disponible
- `materias/[id]/asistencia` POST: `materia_id` → join a `materias(curso_id)` o fetch separado

### Puntos de lectura actualizados

**`cuaderno/page.tsx`**: `periodoCerrado` pasa a `isCerradoParaCurso` usando el `cursoId` de `selectedMateria`.

**`notas/[evaluacion_id]/page.tsx`**: `isCerrado` pasa a `isCerradoParaCurso` usando el `cursoId` de `evaluacion.materias`.

**`libreta/[alumno_id]/boletin/page.tsx`**: filtro `notasVisible` usa `isPublicadoParaCurso`. El alumno pertenece a un único curso activo (inscripción activa) → se fetcha una sola fila de override por `(periodo_id, curso_id)`.

**`libreta/[alumno_id]/confirmar/page.tsx`**: mismo patrón que boletin.

### UI: panel de cierre granular en Configuración > Períodos

Nueva sección visible bajo cada período cerrado o en progreso:

```
Período: 1er Cuatrimestre               [Cerrar todos] [Publicar todos]
┌─────────────────┬──────────────┬─────────────────────────────────────┐
│ Curso           │ Estado       │ Acciones                            │
├─────────────────┼──────────────┼─────────────────────────────────────┤
│ 3° A            │ ● Publicado  │ [Despublicar] [Reabrir]             │
│ 3° B            │ ● Cerrado    │ [Publicar]    [Reabrir]             │
│ 4° A            │ ○ Abierto    │ [Cerrar]                            │
│ 4° B            │ ○ Abierto    │ [Cerrar]                            │
└─────────────────┴──────────────┴─────────────────────────────────────┘
```

El resumen de estado del período actual en periodos/page.tsx se extiende con un indicador "(3/4 cursos cerrados)" cuando hay cierre parcial.

## Non-goals

- Granularidad por materia (demasiado operativa).
- Cambiar el concepto de "período activo" (sigue siendo período-level).
- Notificaciones por-curso (se notifica a nivel período global como hoy).
- RLS en `periodo_cierre_cursos` (solo admins acceden a estas rutas).
