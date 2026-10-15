# Cierre de Período — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al admin cerrar un período académico, bloqueando ediciones de notas/evaluaciones/asistencia, activando el siguiente período, y notificando a responsables por email con link a la libreta digital.

**Architecture:** Lock flag `cerrado_at` en `periodos` (columna nullable, NULL = abierto). APIs de cierre/reabrir/notificar como sub-rutas de `/api/v1/instituciones/[id]/periodos/[periodo_id]/`. Lock checks en 5 APIs existentes verifican `periodo.cerrado_at` antes de mutaciones. UI extiende la página de configuración de períodos existente.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + RLS, TypeScript strict, Zod 4, React Email + Resend, shadcn/base-ui, Sonner toasts.

**Spec:** `docs/superpowers/specs/2026-10-15-cierre-periodo-design.md`

## Global Constraints

- API responses: `ok(data)` / `created(data)` / `Err.*()` de `@/lib/api`; `Err.conflict(msg)` existe (409)
- Auth: `getSession()` + `hasRole/hasAnyRole/isSuperadmin` de `@/lib/auth`
- Params Next.js 16: `const { id } = await params` (params es Promise)
- Zod 4: `.strict()` en schemas de body
- Soft delete: `.is('deleted_at', null)` en todas las queries
- Solo admin: `hasRole(session, inst_id, 'admin') || isSuperadmin(session)` — responsable y docente no pueden cerrar
- APP_URL: `process.env.NEXT_PUBLIC_APP_URL`
- Email: React Email con `Tailwind + pixelBasedPreset`, mismo patrón que `src/emails/bienvenida.tsx`
- `session.persona_id` disponible para auditoría (`cerrado_por`)

## Review Focus

- **Período ya cerrado → POST /cerrar retorna 409**: si `periodo.cerrado_at IS NOT NULL` → `Err.conflict('Período ya cerrado')`. Task 2 Step 6.
- **Asistencia con `total_clases = 0` no cuenta como cargada**: cierre-preview excluye registros con `total_clases = 0` al construir `asistenciaExistente`. Task 2 Step 1 (test).
- **Alumno inscripto en materia sin evaluaciones no aparece como faltante**: solo se reporta faltante si el alumno tiene inscripción en la materia Y hay evaluaciones en el período para esa materia. Task 2 Step 1 (test).
- **Lock retorna 409 Conflict, no 403**: usar `Err.conflict('Período cerrado')` en lock enforcement para distinguirlo de "sin permisos". Task 4.
- **POST /notificar sin responsables con email → `{ enviados: 0, errores: 0 }`**: `Promise.allSettled` sobre array vacío retorna correctamente. Task 3 Step 2.

---

### Task 1: Migración DB — `activo`, `cerrado_at`, `cerrado_por` en `periodos`

**Files:**
- Create: `supabase/migrations/20261015000001_cierre_periodo.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: `periodos.activo BOOLEAN NOT NULL DEFAULT false`, `periodos.cerrado_at TIMESTAMPTZ`, `periodos.cerrado_por UUID REFERENCES personas(id)`; UNIQUE partial index `idx_periodos_activo_unico`

- [ ] **Step 1: Escribir migración**

```sql
ALTER TABLE periodos
  ADD COLUMN activo      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cerrado_at  TIMESTAMPTZ,
  ADD COLUMN cerrado_por UUID REFERENCES personas(id);

CREATE UNIQUE INDEX idx_periodos_activo_unico
  ON periodos(año_lectivo_id)
  WHERE activo = true AND deleted_at IS NULL;
```

- [ ] **Step 2: Aplicar migración**

Usar `mcp__supabase__apply_migration` con la SQL anterior.

- [ ] **Step 3: Verificar columnas**

`mcp__supabase__execute_sql`: `SELECT column_name FROM information_schema.columns WHERE table_name = 'periodos' ORDER BY ordinal_position`

Expected: columnas `activo`, `cerrado_at`, `cerrado_por` presentes.

- [ ] **Step 4: Regenerar types**

`mcp__supabase__generate_typescript_types` → actualizar `src/types/database.ts`. Verificar que `periodos` Row incluye `activo: boolean`, `cerrado_at: string | null`, `cerrado_por: string | null`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261015000001_cierre_periodo.sql src/types/database.ts
git commit -m "feat: add activo/cerrado_at/cerrado_por to periodos"
```

---

### Task 2: APIs de gestión de cierre — cierre-preview, cerrar, reabrir

**Files:**
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/cierre-preview/route.ts`
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/cerrar/route.ts`
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/reabrir/route.ts`
- Create: `src/lib/cierre-periodo.ts`
- Create: `src/tests/lib/cierre-periodo.test.ts`

**Interfaces:**
- Consumes: `periodos.cerrado_at`, `periodos.activo`, `periodos.orden`, `periodos.año_lectivo_id` (Task 1)
- Produces:
  - `buildCierrePreview(opts) → CierrePreview` en `src/lib/cierre-periodo.ts`
  - `type CierrePreview = { total_alumnos: number; total_materias: number; alumnos_sin_notas: Array<{alumno_id: string; alumno_nombre: string; materias_sin_notas: string[]}>; materias_sin_asistencia: Array<{materia_id: string; materia_nombre: string}>; completo: boolean }`
  - `GET .../cierre-preview` → `CierrePreview`
  - `POST .../cerrar` body `{ activar_siguiente: boolean }` → `{ cerrado: true; siguiente_activado: boolean }`
  - `POST .../reabrir` → `{ reabierto: true }`

- [ ] **Step 1: Escribir tests para `buildCierrePreview`**

```typescript
// src/tests/lib/cierre-periodo.test.ts
import { describe, it, expect } from 'vitest'
import { buildCierrePreview } from '@/lib/cierre-periodo'

describe('buildCierrePreview', () => {
  it('completo:true cuando todos los alumnos tienen notas y asistencia', () => {
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(['a1:m1']),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.completo).toBe(true)
    expect(result.alumnos_sin_notas).toHaveLength(0)
    expect(result.materias_sin_asistencia).toHaveLength(0)
  })

  it('detecta alumno sin notas en materia', () => {
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(),
      asistenciaExistente: new Set(['m1']),
    })
    expect(result.completo).toBe(false)
    expect(result.alumnos_sin_notas[0].materias_sin_notas).toContain('Inglés')
  })

  it('no reporta faltante cuando materia no tiene evaluaciones en el período', () => {
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map(), // sin evaluaciones → no hay nada que completar
      notasExistentes: new Set(),
      asistenciaExistente: new Set(),
    })
    expect(result.alumnos_sin_notas).toHaveLength(0)
  })

  it('no incluye materia en asistencia_sin_cargar si no tiene total_clases > 0', () => {
    // asistenciaExistente solo incluye materias con total_clases > 0 — test que Set vacío = reporta faltante
    const result = buildCierrePreview({
      alumnos: [{ id: 'a1', nombre: 'Juan' }],
      materias: [{ id: 'm1', nombre: 'Inglés' }],
      inscripciones: [{ alumno_id: 'a1', materia_id: 'm1' }],
      evaluacionesPorMateria: new Map([['m1', true]]),
      notasExistentes: new Set(['a1:m1']),
      asistenciaExistente: new Set(), // sin registros con total_clases > 0
    })
    expect(result.materias_sin_asistencia[0].materia_id).toBe('m1')
  })
})
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
npx vitest run src/tests/lib/cierre-periodo.test.ts
```
Expected: FAIL — `buildCierrePreview` no existe.

- [ ] **Step 3: Crear `src/lib/cierre-periodo.ts`**

Exportar `CierrePreview` type y `buildCierrePreview(opts: { alumnos, materias, inscripciones, evaluacionesPorMateria: Map<materia_id, boolean>, notasExistentes: Set<'alumno_id:materia_id'>, asistenciaExistente: Set<materia_id> }) → CierrePreview`.

Lógica: iterar inscripciones; por cada `(alumno_id, materia_id)` donde `evaluacionesPorMateria.has(materia_id)`, si `!notasExistentes.has('alumno_id:materia_id')` → agregar a faltantes. Para cada materia donde `evaluacionesPorMateria.has(materia_id)` y `!asistenciaExistente.has(materia_id)` → agregar a `materias_sin_asistencia`. `completo = alumnos_sin_notas.length === 0 && materias_sin_asistencia.length === 0`.

- [ ] **Step 4: Correr tests — deben pasar**

```bash
npx vitest run src/tests/lib/cierre-periodo.test.ts
```
Expected: PASS 4/4.

- [ ] **Step 5: Implementar `cierre-preview/route.ts` — GET**

Tipo Params: `{ params: Promise<{ id: string; periodo_id: string }> }`.

Flujo:
1. `const { id: institucion_id, periodo_id } = await params`
2. Auth: `getSession()` → unauthorized; `!isSuperadmin && !hasRole(session, institucion_id, 'admin')` → forbidden
3. Cargar período: `periodos` WHERE `id = periodo_id AND institucion_id = institucion_id AND deleted_at IS NULL` → notFound si no existe
4. Cargar `cursos` WHERE `año_lectivo_id = periodo.año_lectivo_id AND deleted_at IS NULL` → `curso_ids`
5. Cargar `materias` JOIN `materias_catalogo(nombre)` WHERE `curso_id IN (curso_ids) AND deleted_at IS NULL`
6. Cargar `alumno_inscripciones` activas JOIN `alumnos(id, nombre)` WHERE `curso_id IN (curso_ids) AND activo = true AND deleted_at IS NULL`
7. Cargar evaluaciones del período: `evaluaciones` WHERE `periodo_id = periodo_id AND deleted_at IS NULL` → construir `Map<materia_id, true>`
8. Cargar notas: `notas` JOIN `evaluaciones(materia_id)` WHERE `evaluaciones.periodo_id = periodo_id AND notas.deleted_at IS NULL` → construir `Set<'alumno_id:materia_id'>`
9. Cargar `asistencia_resumen` WHERE `periodo_id = periodo_id AND total_clases > 0` → construir `Set<materia_id>`
10. Llamar `buildCierrePreview(...)` → `ok(result)`

- [ ] **Step 6: Implementar `cerrar/route.ts` — POST**

Schema: `z.object({ activar_siguiente: z.boolean().default(true) }).strict()`.

Flujo:
1. Auth + período lookup (igual que cierre-preview)
2. Si `periodo.cerrado_at IS NOT NULL` → `return Err.conflict('Período ya cerrado')`
3. `UPDATE periodos SET cerrado_at = now(), cerrado_por = session.persona_id WHERE id = periodo_id`
4. Si `activar_siguiente`:
   - SELECT período con `orden = periodo.orden + 1 AND año_lectivo_id = periodo.año_lectivo_id AND deleted_at IS NULL`
   - Si existe: `UPDATE periodos SET activo = false WHERE año_lectivo_id = periodo.año_lectivo_id AND activo = true`; luego `UPDATE SET activo = true WHERE id = siguiente.id`
5. `return ok({ cerrado: true, siguiente_activado: !!siguiente })`

- [ ] **Step 7: Implementar `reabrir/route.ts` — POST**

Auth + período lookup. `UPDATE periodos SET cerrado_at = NULL, cerrado_por = NULL WHERE id = periodo_id`. `return ok({ reabierto: true })`.

- [ ] **Step 8: Correr suite de tests**

```bash
npx vitest run
```
Expected: todos los tests pasan.

- [ ] **Step 9: Commit**

```bash
git add src/lib/cierre-periodo.ts src/tests/lib/cierre-periodo.test.ts src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/
git commit -m "feat: APIs cierre-preview, cerrar y reabrir período"
```

---

### Task 3: Email template + API notificar

**Files:**
- Create: `src/emails/cierre-periodo.tsx`
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/notificar/route.ts`

**Interfaces:**
- Consumes: patrón Resend de `src/lib/notificaciones.ts`; `alumno_responsables(alumno_id, persona_id)` → `personas(email, nombre)`; `instituciones(slug)`
- Produces:
  - `CierrePeriodoEmail({ alumno_nombre, periodo_nombre, institucion_nombre, boletin_url })` — exportado desde `src/emails/cierre-periodo.tsx`
  - `POST .../notificar` → `{ enviados: number; errores: number }`

- [ ] **Step 1: Crear `src/emails/cierre-periodo.tsx`**

Mismo patrón que `bienvenida.tsx`: `Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr, Tailwind, pixelBasedPreset`.

Props interface `CierrePeriodoEmailProps`: `{ alumno_nombre: string; periodo_nombre: string; institucion_nombre: string; boletin_url: string }`.

Preview text: `Libreta de ${alumno_nombre} — ${periodo_nombre}`.
Botón: "Ver libreta digital" → `boletin_url`.

`CierrePeriodoEmail.PreviewProps` con valores de ejemplo.

- [ ] **Step 2: Implementar `notificar/route.ts` — POST**

No tiene body (POST sin schema Zod).

Flujo:
1. Auth: admin o superadmin
2. Cargar período + institución: `periodos` JOIN `instituciones(slug, nombre)` WHERE `id = periodo_id`
3. Si `periodo.cerrado_at IS NULL` → `Err.validation('El período debe estar cerrado antes de notificar')`
4. Cargar alumnos activos: `alumnos` WHERE `institucion_id = institucion_id AND deleted_at IS NULL AND activo = true`
5. Para cada alumno: SELECT `alumno_responsables` JOIN `personas(id, nombre, email)` WHERE `alumno_id = alumno.id AND personas.email IS NOT NULL`
6. Construir lista de emails a enviar: `Array<{ to: string; alumno_nombre: string }>`
7. `await Promise.allSettled(emails.map(e => resend.emails.send({ from, to: e.to, subject: `Libreta de ${e.alumno_nombre} — ${periodo.nombre} cerrado`, react: CierrePeriodoEmail({...}) })))`
8. Contar `fulfilled` vs `rejected` → `ok({ enviados, errores })`

`from`: mismo valor que usan los otros emails del proyecto (leer de `src/lib/notificaciones.ts`).

- [ ] **Step 3: Verificar manualmente**

Llamar al endpoint con período cerrado de prueba → verificar que llega el email al responsable de un alumno de prueba.

- [ ] **Step 4: Commit**

```bash
git add src/emails/cierre-periodo.tsx src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/notificar/route.ts
git commit -m "feat: email template y API notificar responsables al cierre de período"
```

---

### Task 4: Lock enforcement en APIs existentes

**Files:**
- Modify: `src/lib/cierre-periodo.ts` (agregar helper)
- Modify: `src/tests/lib/cierre-periodo.test.ts` (agregar test)
- Modify: `src/app/api/v1/materias/[id]/evaluaciones/route.ts`
- Modify: `src/app/api/v1/evaluaciones/[id]/route.ts`
- Modify: `src/app/api/v1/notas/bulk/route.ts`
- Modify: `src/app/api/v1/notas/[id]/route.ts`
- Modify: `src/app/api/v1/materias/[id]/asistencia/route.ts`

**Interfaces:**
- Consumes: `periodos.cerrado_at` (Task 1); `buildCierrePreview` module in `src/lib/cierre-periodo.ts` (Task 2)
- Produces: `Err.conflict('Período cerrado')` (409) en las 5 APIs si `periodo.cerrado_at IS NOT NULL`

- [ ] **Step 1: Agregar helper y test en `src/lib/cierre-periodo.ts`**

Agregar al test:
```typescript
import { isPeriodoCerrado } from '@/lib/cierre-periodo'

it('isPeriodoCerrado retorna true cuando cerrado_at tiene valor', () => {
  expect(isPeriodoCerrado('2026-10-15T00:00:00Z')).toBe(true)
  expect(isPeriodoCerrado(null)).toBe(false)
  expect(isPeriodoCerrado(undefined)).toBe(false)
})
```

Agregar a `src/lib/cierre-periodo.ts`:
```typescript
export function isPeriodoCerrado(cerrado_at: string | null | undefined): boolean {
  return cerrado_at != null
}
```

Correr: `npx vitest run src/tests/lib/cierre-periodo.test.ts` — PASS.

- [ ] **Step 2: Lock en `POST /materias/[id]/evaluaciones`**

Después de parsear body: si `parsed.data.periodo_id` existe, SELECT `periodos WHERE id = periodo_id` → si `isPeriodoCerrado(periodo?.cerrado_at)` → `return Err.conflict('Período cerrado')`.

- [ ] **Step 3: Lock en `PATCH /evaluaciones/[id]`**

En `resolveEvaluacion`, agregar `periodo_id` al SELECT de evaluacion. Después de resolver: si `evaluacion.periodo_id`, SELECT `periodos WHERE id = evaluacion.periodo_id` → si `isPeriodoCerrado(periodo?.cerrado_at)` → `return Err.conflict('Período cerrado')`.

- [ ] **Step 4: Lock en `DELETE /evaluaciones/[id]`**

Mismo check que PATCH (misma `resolveEvaluacion`). Agregar antes del soft-delete.

- [ ] **Step 5: Lock en `POST /notas/bulk`**

Después de cargar `evaluacion`: SELECT `periodos WHERE id = evaluacion.periodo_id` → si `isPeriodoCerrado(periodo?.cerrado_at)` → `return Err.conflict('Período cerrado')`.

- [ ] **Step 6: Lock en `PATCH /notas/[id]`**

Después de cargar `nota`: SELECT `evaluaciones(periodo_id) WHERE id = nota.evaluacion_id` → si `evaluacion.periodo_id`, SELECT `periodos(cerrado_at) WHERE id = evaluacion.periodo_id` → si `isPeriodoCerrado(periodo?.cerrado_at)` → `return Err.conflict('Período cerrado')`. Nota: si `periodo_id IS NULL`, no hay lock.

- [ ] **Step 7: Lock en `POST /materias/[id]/asistencia`**

Después de parsear body (tiene `periodo_id`): SELECT `periodos WHERE id = periodo_id` → si `isPeriodoCerrado(periodo?.cerrado_at)` → `return Err.conflict('Período cerrado')`.

- [ ] **Step 8: Correr `tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 9: Correr suite completa de tests**

```bash
npx vitest run
```
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/cierre-periodo.ts src/tests/lib/cierre-periodo.test.ts src/app/api/v1/materias/[id]/evaluaciones/route.ts src/app/api/v1/evaluaciones/[id]/route.ts src/app/api/v1/notas/bulk/route.ts src/app/api/v1/notas/[id]/route.ts src/app/api/v1/materias/[id]/asistencia/route.ts
git commit -m "feat: lock enforcement — bloquear mutaciones en período cerrado"
```

---

### Task 5: UI — Períodos page + modals + lock banners

**Files:**
- Modify: `src/app/dashboard/[slug]/configuracion/periodos/page.tsx`
- Create: `src/app/dashboard/[slug]/configuracion/periodos/cerrar-periodo-sheet.tsx`
- Create: `src/app/dashboard/[slug]/configuracion/periodos/reabrir-periodo-button.tsx`
- Create: `src/app/dashboard/[slug]/configuracion/periodos/notificar-periodo-dialog.tsx`
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx`
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/asistencia/page.tsx`

**Interfaces:**
- Consumes: endpoints `cierre-preview`, `cerrar`, `reabrir`, `notificar` (Tasks 2, 3); `periodos.activo`, `periodos.cerrado_at` (Task 1)
- Produces: UI completa de cierre de período

- [ ] **Step 1: Actualizar SELECT en `page.tsx` de períodos**

Cambiar `periodos(id, nombre, orden)` a `periodos(id, nombre, orden, activo, cerrado_at)` en el query de `años_lectivos`. Actualizar type `Periodo` para incluir `activo: boolean`, `cerrado_at: string | null`.

- [ ] **Step 2: Agregar badges y botones en `page.tsx`**

Por cada período mostrar:
- Badge `Activo` si `p.activo = true`
- Badge `Cerrado` (variant `secondary`) si `p.cerrado_at IS NOT NULL`
- `<CerrarPeriodoSheet instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />` si `!p.cerrado_at && isAdmin`
- `<ReabrirPeriodoButton instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />` si `p.cerrado_at && isAdmin`
- `<NotificarPeriodoDialog instId={inst.id} periodoId={p.id} periodoNombre={p.nombre} />` si `p.cerrado_at && isAdmin`

`isAdmin` = `isSuperadmin(session) || hasRole(session, inst.id, 'admin')`.

- [ ] **Step 3: Crear `cerrar-periodo-sheet.tsx` (client component)**

Props: `{ instId: string; periodoId: string; periodoNombre: string }`.

Estado: `open: boolean`, `loading: boolean`, `preview: CierrePreview | null`, `activarSiguiente: boolean` (default true), `submitting: boolean`.

Al `open = true`: fetch `GET /api/v1/instituciones/${instId}/periodos/${periodoId}/cierre-preview` → setPreview.

UI (Sheet):
- Trigger: `<Button variant="outline" size="sm">Cerrar período</Button>`
- Mientras loading: spinner
- Si `preview.completo`: `<p>Todos los datos están completos.</p>`
- Si no: lista de advertencias con alumnos sin notas y materias sin asistencia; texto "Podés cerrar igual, pero estos datos quedarán incompletos."
- `<Checkbox checked={activarSiguiente} onCheckedChange={setActivarSiguiente}>Activar siguiente período automáticamente</Checkbox>`
- Botón "Cerrar período" → POST `/cerrar` con `{ activar_siguiente }` → `toast.success('Período cerrado')` → `router.refresh()`

- [ ] **Step 4: Crear `reabrir-periodo-button.tsx` (client component)**

Props: `{ instId: string; periodoId: string; periodoNombre: string }`.

`AlertDialog` con trigger "Reabrir" y confirmación. On confirm: POST `/reabrir` → `toast.success('Período reabierto')` → `router.refresh()`.

- [ ] **Step 5: Crear `notificar-periodo-dialog.tsx` (client component)**

Props: `{ instId: string; periodoId: string; periodoNombre: string }`.

`AlertDialog`: "Se enviará un email a los responsables de los alumnos con link a la libreta digital."
On confirm: POST `/notificar` → respuesta `{ enviados, errores }` → `toast.success(\`${enviados} emails enviados\`)` → si `errores > 0`: `toast.error(\`${errores} errores al enviar\`)`.

- [ ] **Step 6: Lock banner en `evaluaciones/page.tsx`**

La página ya carga evaluaciones con `periodos(id, nombre)`. Agregar `cerrado_at` al SELECT de periodos. Si el período seleccionado tiene `cerrado_at IS NOT NULL`, renderizar antes de la lista:

```tsx
<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
  Este período está cerrado. No se pueden editar datos.
</div>
```

- [ ] **Step 7: Lock banner en `asistencia/page.tsx`**

La página recibe `periodo_id` de searchParams y carga el período. Agregar `cerrado_at` al SELECT. Mismo banner que evaluaciones.

- [ ] **Step 8: Verificar manualmente en browser**

1. Configuración → Períodos: botón "Cerrar período" abre sheet con preview
2. Al cerrar: badge "Cerrado" aparece, botones cambian a Reabrir / Enviar libretas
3. Enviar libretas: dialog → confirmación → toast con count
4. Evaluaciones de materia con período cerrado: banner visible, NuevaEvaluacion deshabilitada o bloqueada por API
5. Intentar guardar nota: error 409 mostrado como toast error

- [ ] **Step 9: Correr `tsc --noEmit`**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/[slug]/configuracion/periodos/ src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx src/app/dashboard/[slug]/materias/[materia_id]/asistencia/page.tsx
git commit -m "feat: UI cierre de período — modals, badges y lock banners"
```
