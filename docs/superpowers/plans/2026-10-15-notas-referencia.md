# Notas de Referencia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Módulo interno de evaluaciones no vinculantes al boletín — el docente carga TPs, lecturas y participación, ve promedio por alumno; tablas separadas garantizan zero leak a libreta.

**Architecture:** Dos tablas nuevas (`evaluaciones_referencia`, `notas_referencia`) con RLS propio. API REST bajo `/api/v1/materias/[id]/evaluaciones-referencia` y `/api/v1/notas-referencia/bulk`. UI nueva en `/materias/[id]/referencia` reutilizando el patrón de evaluaciones/notas existentes. Función pura `calcPromedioReferencia` para el cálculo del promedio.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + RLS, TypeScript strict, Zod 4, shadcn/base-ui, Sonner toasts, vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-notas-referencia-design.md`

## Global Constraints

- `institucion_id` en todas las tablas para RLS multi-tenant
- Soft delete: `deleted_at TIMESTAMPTZ` en `evaluaciones_referencia`; `notas_referencia` sin soft delete (ON DELETE CASCADE)
- API responses: `ok(data)` / `created(data)` / `Err.*()` de `@/lib/api`
- Auth: `getSession()` + `hasAnyRole(session, inst_id, ['admin','docente'])` de `@/lib/auth`
- Next.js 16 params: `const { id } = await params` (params es Promise)
- Zod 4: `z.object({}).strict()` en todos los body schemas
- `tipo` en evaluaciones_referencia: `'numerica' | 'conceptual'` — no reutiliza tipos de evaluaciones oficiales
- Sin lock de período (notas de referencia no se bloquean con cierre)
- Sin notificaciones email (módulo interno)

## Review Focus

- Alumno sin notas en una evaluación de referencia: `calcPromedioReferencia` recibe array con todos null → debe retornar `null`, no `NaN` ni `0` — Task 2 test.
- Docente que no está asignado a la materia: GET/POST deben retornar 403 — mismo check que evaluaciones page; Task 3 auth check.
- DELETE de evaluación de referencia con notas cargadas: `ON DELETE CASCADE` en `notas_referencia(evaluacion_ref_id)` — si falla silenciosamente, notas huérfanas — Task 1 migración.
- Bulk upsert con `evaluacion_ref_id` que no pertenece a la institución del docente: debe retornar 403/404 — Task 4 auth check.
- Promedio con mezcla de `valor_numerico` y `valor_literal` (tipo conceptual): ignorar literales en el cálculo, solo promediar numéricos — Task 2 test.

---

### Task 1: Migración DB

**Files:**
- Create: `supabase/migrations/20261015000002_notas_referencia.sql`

**Interfaces:**
- Produces:
  - `evaluaciones_referencia(id, materia_id, institucion_id, nombre, tipo, fecha, docente_id, created_at, deleted_at)`
  - `notas_referencia(id, evaluacion_ref_id, alumno_id, institucion_id, valor_numerico, valor_literal, observacion, docente_id, created_at)` con UNIQUE(evaluacion_ref_id, alumno_id)
  - RLS en ambas tablas usando funciones RLS existentes `has_any_role()` e `is_superadmin()`

- [ ] **Step 1: Escribir migración**

```sql
CREATE TABLE evaluaciones_referencia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id     UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  institucion_id UUID NOT NULL,
  nombre         TEXT NOT NULL CHECK (char_length(nombre) >= 1),
  tipo           TEXT NOT NULL DEFAULT 'numerica',
  fecha          DATE,
  docente_id     UUID REFERENCES personas(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_ev_ref_materia ON evaluaciones_referencia(materia_id);
CREATE INDEX idx_ev_ref_inst ON evaluaciones_referencia(institucion_id);

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

ALTER TABLE evaluaciones_referencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_referencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY ev_ref_tenant ON evaluaciones_referencia
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  );

CREATE POLICY notas_ref_tenant ON notas_referencia
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  );
```

- [ ] **Step 2: Aplicar migración**

```bash
npx supabase db push
```
Expected: `Applied 1 migration`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261015000002_notas_referencia.sql
git commit -m "feat: tablas evaluaciones_referencia y notas_referencia"
```

---

### Task 2: Función pura `calcPromedioReferencia`

**Files:**
- Modify: `src/lib/notas-referencia.ts` (crear)
- Test: `src/tests/lib/notas-referencia.test.ts`

**Interfaces:**
- Produces: `calcPromedioReferencia(notas: { valor_numerico: number | null }[]): number | null`
  - Retorna null si array vacío o todos los valores son null
  - Retorna promedio con 2 decimales (Math.round) de valores no-null
  - Ignora valor_literal (no lo recibe)

- [ ] **Step 1: Escribir tests**

```typescript
// src/tests/lib/notas-referencia.test.ts
import { calcPromedioReferencia } from '@/lib/notas-referencia'

it('retorna null si array vacío', () => {
  expect(calcPromedioReferencia([])).toBeNull()
})

it('retorna null si todos los valores son null', () => {
  expect(calcPromedioReferencia([{ valor_numerico: null }, { valor_numerico: null }])).toBeNull()
})

it('ignora nulls al promediar', () => {
  expect(calcPromedioReferencia([
    { valor_numerico: 8 },
    { valor_numerico: null },
    { valor_numerico: 6 },
  ])).toBe(7)
})

it('promedio exacto con 2 decimales', () => {
  expect(calcPromedioReferencia([
    { valor_numerico: 7 },
    { valor_numerico: 8 },
    { valor_numerico: 9 },
  ])).toBe(8)
})

it('un solo valor no-null', () => {
  expect(calcPromedioReferencia([{ valor_numerico: 5.5 }])).toBe(5.5)
})
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
npx vitest run src/tests/lib/notas-referencia.test.ts
```
Expected: FAIL — `calcPromedioReferencia is not a function`

- [ ] **Step 3: Implementar `calcPromedioReferencia` en `src/lib/notas-referencia.ts`**

Signature: `export function calcPromedioReferencia(notas: { valor_numerico: number | null }[]): number | null`

Filtrar array a valores no-null, si vacío retornar null, calcular promedio redondeando a 2 decimales con `Math.round(sum / count * 100) / 100`.

- [ ] **Step 4: Correr tests — deben pasar**

```bash
npx vitest run src/tests/lib/notas-referencia.test.ts
```
Expected: PASS 5/5

- [ ] **Step 5: Commit**

```bash
git add src/lib/notas-referencia.ts src/tests/lib/notas-referencia.test.ts
git commit -m "feat: calcPromedioReferencia — promedio interno notas de referencia"
```

---

### Task 3: API evaluaciones de referencia

**Files:**
- Create: `src/app/api/v1/materias/[id]/evaluaciones-referencia/route.ts`
- Create: `src/app/api/v1/evaluaciones-referencia/[ref_id]/route.ts`

**Interfaces:**
- Consumes: tablas Task 1
- Produces:
  - `GET /api/v1/materias/[id]/evaluaciones-referencia` → `{ id, nombre, tipo, fecha, created_at }[]` ordenado por `created_at DESC`
  - `POST /api/v1/materias/[id]/evaluaciones-referencia` body `{ nombre: string, tipo: 'numerica'|'conceptual', fecha?: string|null }` → `{ id, nombre, tipo, fecha, created_at }`
  - `PATCH /api/v1/evaluaciones-referencia/[ref_id]` body `{ nombre?, tipo?, fecha? }` → `{ id, nombre, tipo, fecha }`
  - `DELETE /api/v1/evaluaciones-referencia/[ref_id]` → `{ deleted: true }` (soft delete)

- [ ] **Step 1: Implementar colección `route.ts`**

`GET`: auth check `hasAnyRole(session, materia.institucion_id, ['admin','docente'])`, SELECT `evaluaciones_referencia` WHERE `materia_id` AND `deleted_at IS NULL` ORDER BY `created_at DESC`.

`POST` schema:
```typescript
z.object({
  nombre: z.string().min(1).max(200),
  tipo: z.enum(['numerica', 'conceptual']),
  fecha: z.string().date().optional().nullable(),
}).strict()
```
INSERT con `materia_id`, `institucion_id`, `docente_id: session.persona_id`.

- [ ] **Step 2: Implementar item `[ref_id]/route.ts`**

Helper `resolveEvRef(supabase, ref_id)`: SELECT `evaluaciones_referencia` WHERE `id = ref_id` AND `deleted_at IS NULL` → retorna `{ id, materia_id, institucion_id }` o null.

`PATCH` schema:
```typescript
z.object({
  nombre: z.string().min(1).max(200).optional(),
  tipo: z.enum(['numerica', 'conceptual']).optional(),
  fecha: z.string().date().nullable().optional(),
}).strict()
```
Auth check via `institucion_id` de `resolveEvRef`.

`DELETE`: UPDATE `deleted_at = now()` WHERE `id = ref_id`.

- [ ] **Step 3: Correr suite completa**

```bash
npx vitest run
```
Expected: todos los tests existentes pasan

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/materias/[id]/evaluaciones-referencia/
git add src/app/api/v1/evaluaciones-referencia/
git commit -m "feat: API CRUD evaluaciones de referencia"
```

---

### Task 4: API notas de referencia bulk

**Files:**
- Create: `src/app/api/v1/notas-referencia/bulk/route.ts`

**Interfaces:**
- Consumes: tablas Task 1
- Produces:
  - `POST /api/v1/notas-referencia/bulk` body `{ evaluacion_ref_id: uuid, notas: [{ alumno_id, valor_numerico?, valor_literal?, observacion? }] }` → `{ upserted: number, skipped: number }`

- [ ] **Step 1: Implementar `route.ts`**

Schema:
```typescript
const BulkRefSchema = z.object({
  evaluacion_ref_id: z.string().uuid(),
  notas: z.array(z.object({
    alumno_id: z.string().uuid(),
    valor_numerico: z.number().nullable().optional(),
    valor_literal: z.string().nullable().optional(),
    observacion: z.string().optional(),
  })).min(1),
}).strict()
```

Flujo:
1. Auth: `getSession()`, require `session.persona_id`
2. Cargar `evaluaciones_referencia` con `id = evaluacion_ref_id` AND `deleted_at IS NULL` → `{ institucion_id }`
3. Auth check: `hasAnyRole(session, institucion_id, ['admin','docente'])`
4. Filtrar `notas` a las que tienen `valor_numerico != null || valor_literal != null` → `toUpsert`
5. UPSERT en `notas_referencia` con conflict `(evaluacion_ref_id, alumno_id)`, campos: `evaluacion_ref_id, alumno_id, institucion_id, valor_numerico, valor_literal, observacion, docente_id: session.persona_id`
6. Retornar `ok({ upserted: toUpsert.length, skipped: notas.length - toUpsert.length })`

- [ ] **Step 2: Correr suite completa**

```bash
npx vitest run
```
Expected: todos pasan

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/notas-referencia/
git commit -m "feat: API bulk upsert notas de referencia"
```

---

### Task 5: UI — página de referencia y editor de notas

**Files:**
- Create: `src/app/dashboard/[slug]/materias/[materia_id]/referencia/page.tsx`
- Create: `src/app/dashboard/[slug]/materias/[materia_id]/referencia/nueva-eval-ref-sheet.tsx`
- Create: `src/app/dashboard/[slug]/materias/[materia_id]/referencia/[ref_id]/page.tsx`
- Create: `src/app/dashboard/[slug]/materias/[materia_id]/referencia/[ref_id]/notas-ref-editor.tsx`
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx`

**Interfaces:**
- Consumes: Tasks 3, 4 (endpoints), Task 2 (`calcPromedioReferencia`)
- Produces: página `/referencia` con lista + botón crear; página `/referencia/[ref_id]` con editor de notas; link "Referencia" en página de evaluaciones

- [ ] **Step 1: Modificar `evaluaciones/page.tsx` — agregar link "Referencia"**

Junto al botón "Asistencia" (línea ~115):
```tsx
<Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/materias/${materia_id}/referencia`} />}>
  <BookMarked data-icon="inline-start" />
  Referencia
</Button>
```
Import: `BookMarked` from `lucide-react`.

- [ ] **Step 2: Implementar `referencia/page.tsx` (server component)**

Props: `Params = { params: Promise<{ slug: string; materia_id: string }> }`

Auth igual que `evaluaciones/page.tsx` — misma verificación de asignación para docentes.

Queries:
- Materia con `materias_catalogo(nombre)` y `cursos(id, nombre)`
- `evaluaciones_referencia` WHERE `materia_id` AND `deleted_at IS NULL` ORDER BY `created_at DESC`

Render: encabezado con breadcrumb (igual que evaluaciones), título "Notas de referencia", botón `NuevaEvalRefSheet`. Tabla: columnas Nombre | Tipo | Fecha | Notas. Cada fila tiene link "Cargar" → `/referencia/[ref_id]`. Tipo mostrado como badge: "Numérica" / "Conceptual".

- [ ] **Step 3: Implementar `nueva-eval-ref-sheet.tsx` (client component)**

Props: `{ materiaId: string }`

Patrón idéntico a `nueva-evaluacion-sheet.tsx`. Form con campos:
- Nombre (input, required)
- Tipo (select: Numérica | Conceptual, required)
- Fecha (date input, opcional)

POST a `/api/v1/materias/${materiaId}/evaluaciones-referencia`. Toast success + `router.refresh()`.

- [ ] **Step 4: Implementar `referencia/[ref_id]/page.tsx` (server component)**

Queries:
- `evaluaciones_referencia` con `id = ref_id`
- Alumnos del curso (misma query que `notas/[evaluacion_id]/page.tsx`: `alumno_inscripciones` → `alumnos`)
- `notas_referencia` WHERE `evaluacion_ref_id = ref_id`

Render: encabezado con breadcrumb, título = nombre de la evaluación, badge del tipo. Pasa a `NotasRefEditor`.

- [ ] **Step 5: Implementar `notas-ref-editor.tsx` (client component)**

Props:
```typescript
interface Props {
  evalRefId: string
  evalRefNombre: string
  tipo: 'numerica' | 'conceptual'
  alumnos: { id: string; nombre: string; apellido: string | null }[]
  notasExistentes: { alumno_id: string; valor_numerico: number | null; valor_literal: string | null; observacion: string | null }[]
}
```

Patrón idéntico a `notas-editor.tsx` sin "ausentes":
- Estado `valores: Record<alumno_id, string>` (inicializado desde notasExistentes)
- Estado `observaciones: Record<alumno_id, string>`
- Botón "Guardar" → POST `/api/v1/notas-referencia/bulk` → toast success
- Footer de tabla: `calcPromedioReferencia` de notas actuales — mostrar `Promedio: {X}` si no es null
- Sort por apellido igual que `notas-editor.tsx`

- [ ] **Step 6: Verificar manualmente end-to-end**

1. Ir a una materia → click "Referencia"
2. Crear evaluación "Lecturas 1er bimestre" tipo Numérica
3. Cargar notas: 7, null, 9, 8
4. Verificar promedio = 8 en footer
5. Volver a lista → ver la evaluación creada

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/[slug]/materias/[materia_id]/referencia/
git add src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx
git commit -m "feat: UI notas de referencia — lista, editor y promedio"
```

---

### Task 6: Soft delete evaluación de referencia desde UI

**Files:**
- Create: `src/app/dashboard/[slug]/materias/[materia_id]/referencia/eval-ref-acciones.tsx`
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/referencia/page.tsx`

**Interfaces:**
- Consumes: `DELETE /api/v1/evaluaciones-referencia/[ref_id]` (Task 3)
- Produces: botón de delete en cada fila de la tabla con AlertDialog de confirmación

- [ ] **Step 1: Implementar `eval-ref-acciones.tsx` (client component)**

Props: `{ refId: string; nombre: string }`

`AlertDialog` con `render={<Button variant="ghost" size="sm" />}` (patrón base-ui). Al confirmar: DELETE a `/api/v1/evaluaciones-referencia/${refId}` → `toast.success('Evaluación eliminada')` → `router.refresh()`.

- [ ] **Step 2: Agregar `EvalRefAcciones` en la tabla de `referencia/page.tsx`**

Nueva columna al final de la tabla.

- [ ] **Step 3: Correr suite completa**

```bash
npx vitest run
```
Expected: todos pasan (incluye los 5 tests de Task 2)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/materias/[materia_id]/referencia/eval-ref-acciones.tsx
git add src/app/dashboard/[slug]/materias/[materia_id]/referencia/page.tsx
git commit -m "feat: eliminar evaluación de referencia con confirmación"
```
