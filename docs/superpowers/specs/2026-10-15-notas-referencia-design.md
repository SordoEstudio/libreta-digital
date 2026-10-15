# Notas de Referencia — Design Spec

**Date:** 2026-10-15  
**Status:** Approved (conversation 2026-10-15)

## Problema

Docentes llevan en planilla papel evaluaciones internas: TPs, lecturas, participación, trabajos de clase. Quieren un lugar en el sistema para registrarlas, calcular un promedio y consultarlo durante el año. Estas notas **no son vinculantes con el boletín** — no aparecen en la libreta del alumno ni se publican a responsables.

## Solución

Módulo independiente de "Notas de Referencia" por materia. Tablas separadas de `evaluaciones` y `notas` para garantizar zero riesgo de leak al boletín.

## Alcance MVP

- Docente/admin crea evaluaciones de referencia en una materia (nombre, tipo, fecha opcional)
- Carga notas numéricas o conceptuales por alumno
- Ve el promedio numérico calculado por alumno (ignorando nulos)
- Lista de evaluaciones de referencia separada de las evaluaciones oficiales
- Sin exportación, sin notificaciones, sin vinculación a período

## Fuera de alcance

- No aparecen en libreta ni boletín (garantía de diseño: tablas separadas)
- No generan recuperatorios
- No tienen lock de período
- No se exportan a PDF ni planilla (futuro)
- No visibles para responsables ni alumnos

## Schema

### `evaluaciones_referencia`

```sql
CREATE TABLE evaluaciones_referencia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id     UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  institucion_id UUID NOT NULL,
  nombre         TEXT NOT NULL CHECK (char_length(nombre) >= 1),
  tipo           TEXT NOT NULL DEFAULT 'numerica',
  -- 'numerica' | 'conceptual'
  fecha          DATE,
  docente_id     UUID REFERENCES personas(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);
```

### `notas_referencia`

```sql
CREATE TABLE notas_referencia (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_ref_id UUID NOT NULL REFERENCES evaluaciones_referencia(id) ON DELETE CASCADE,
  alumno_id         UUID NOT NULL REFERENCES alumnos(id),
  institucion_id    UUID NOT NULL,
  valor_numerico    NUMERIC,
  valor_literal     TEXT,
  observacion       TEXT,
  docente_id        UUID REFERENCES personas(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evaluacion_ref_id, alumno_id)
);
```

### RLS

Mismo patrón que `evaluaciones`: acceso via `materias.institucion_id`. Roles admin + docente pueden leer y escribir. Responsable y alumno: sin acceso.

## API

| Método | Ruta | Quién | Qué hace |
|--------|------|-------|----------|
| GET | `/api/v1/materias/[id]/evaluaciones-referencia` | admin, docente | Lista evaluaciones de referencia de la materia |
| POST | `/api/v1/materias/[id]/evaluaciones-referencia` | admin, docente | Crea evaluación de referencia |
| PATCH | `/api/v1/evaluaciones-referencia/[ref_id]` | admin, docente | Edita nombre/tipo/fecha |
| DELETE | `/api/v1/evaluaciones-referencia/[ref_id]` | admin, docente | Soft delete |
| POST | `/api/v1/notas-referencia/bulk` | admin, docente | Upsert notas por evaluación |

## UI

### Navegación

Nueva ruta `/dashboard/[slug]/materias/[materia_id]/referencia`. Link "Referencia" en la página de evaluaciones junto al botón "Asistencia" existente.

### Página de referencia (`/materias/[id]/referencia`)

Server component. Carga:
- Evaluaciones de referencia de la materia
- Alumnos del curso

Muestra tabla de evaluaciones de referencia. Botón "Nueva evaluación de referencia". Cada fila tiene link a la página de carga de notas de referencia.

### Página de notas de referencia (`/materias/[id]/referencia/[ref_id]`)

Mismo patrón que `/notas/[evaluacion_id]` con `NotasEditor`. Columnas: Alumno | Nota | Observación. Sin ausentes (no aplica para referencia). Muestra promedio del curso al final de la tabla (solo valores numéricos no nulos).

### Cálculo de promedio

Función pura `calcPromedioReferencia(notas: { valor_numerico: number | null }[]): number | null`. Retorna null si ningún valor es numérico. Mostrado como `Promedio: X.X` en el footer de la tabla.

## Constraints

- Todas las tablas: `institucion_id` para RLS multi-tenant
- Soft delete: `deleted_at TIMESTAMPTZ` en `evaluaciones_referencia`; `notas_referencia` sin soft delete (CASCADE del padre)
- API responses: `ok(data)` / `created(data)` / `Err.*()` de `@/lib/api`
- Auth: `getSession()` + `hasAnyRole(session, inst_id, ['admin','docente'])` de `@/lib/auth`
- Params Next.js 16: `const { id } = await params`
- Zod 4: `z.object({}).strict()`
- `tipo` values: `'numerica' | 'conceptual'` (no `'parcial'` ni otros tipos del sistema oficial)
