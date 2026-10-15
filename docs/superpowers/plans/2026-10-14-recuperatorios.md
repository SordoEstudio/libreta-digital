# Recuperatorios para Evaluaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow evaluaciones to be flagged as "permite recuperatorio"; after notas are loaded a docente/admin can generate a linked recuperatorio evaluacion, and the notas page highlights alumnos below the institution's passing threshold.

**Architecture:** Two new boolean columns (`permite_recuperatorio`) on `evaluaciones` and `evaluaciones_template`, one self-referencing nullable FK (`recuperatorio_de_evaluacion_id`) on `evaluaciones`, and `nota_aprobacion` (numeric, default 6) on `instituciones`. A new API route generates the recuperatorio evaluacion. UI additions: checkbox in all four sheets, "Generar recuperatorio" button + "Ver recuperatorio" link in the evaluaciones list, and a threshold indicator column in the notas editor.

**Tech Stack:** Next.js 16 App Router (server + client components), Supabase PostgreSQL + RLS, Zod 4, Base UI Select, TypeScript strict, `@/lib/api` (`ok`/`created`/`Err.*`), `@/lib/auth` (`getSession`, `requireSession`, `isSuperadmin`, `hasAnyRole`, `hasRole`).

**Spec:** This plan is the spec. Conversation context: evaluaciones already have `tipo = 'recuperatorio'` in the enum; `nota_aprobacion` does not exist yet on any table; no automated test framework exists in the project (verification = `npx tsc --noEmit` + browser).

## Global Constraints

- Next.js 16: `params: Promise<{...}>` must be awaited; `searchParams` is also a Promise.
- Supabase client: always `await createClient()`.
- API responses: `ok(data)` / `created(data)` / `Err.*()` from `@/lib/api` only.
- Auth guards: `requireSession()` in server components, `getSession()` in API routes.
- Soft-delete pattern: `is('deleted_at', null)` on all queries.
- RLS context: multi-tenant via `institucion_id`; existing policies cover new evaluacion rows.
- No automated test framework; each task verifies with `npx tsc --noEmit`. Browser verification noted per task.
- Client components: `'use client'`, `useTransition`, `fetch` + `toast` from sonner, `router.refresh()`.
- Base UI Select (`@base-ui/react/select`): `SelectValue` requires explicit `children` for label display when value is opaque.
- Commit after every task.

## Review Focus

1. **Recuperatorio generated twice**: if two users click "Generar" concurrently, two recuperatorio evaluaciones are created for the same original. The endpoint must check for an existing recuperatorio before inserting (Task 3 covers this, but the check is not atomic — reviewer should flag if a DB UNIQUE constraint is needed).
2. **nota_aprobacion null**: if `instituciones.nota_aprobacion` is NULL (row predates migration), the threshold indicator must not crash — treat as "no threshold" (Task 1 sets DEFAULT 6 so new rows are fine; old rows get 6 via the migration default too, since ALTER TABLE applies DEFAULT retroactively in Postgres on ADD COLUMN).
3. **Recuperatorio of a recuperatorio**: nothing prevents `permite_recuperatorio = true` on a recuperatorio evaluacion, creating infinite chains. The "Generar" button and the API must reject if the evaluacion itself has `recuperatorio_de_evaluacion_id IS NOT NULL` (covered in Task 3 API validation).
4. **Template propagation**: when `permite_recuperatorio` propagates via template, instances get the flag correctly; but the recuperatorio instance is per-materia not per-template — test creating template with flag, verify all instances carry it (Task 2 verification).
5. **Zero-nota alumnos**: alumnos with no nota yet (not entered) should not be treated as "failed" in the threshold indicator — only alumnos with an actual `valor_numerico` below threshold are highlighted; null valor = not yet entered (Task 5 notas editor).

---

### Task 1: DB migration + TypeScript types

**Files:**
- Create: `supabase/migrations/20261014000004_recuperatorios.sql`
- Modify: `src/types/database.ts` (instituciones Row/Insert/Update; evaluaciones Row/Insert/Update; evaluaciones_template Row/Insert/Update)

**Interfaces:**
- Produces:
  - `instituciones.nota_aprobacion: number` (Row), `number | undefined` (Insert/Update)
  - `evaluaciones.permite_recuperatorio: boolean` (Row), `boolean | undefined` (Insert/Update)
  - `evaluaciones.recuperatorio_de_evaluacion_id: string | null` (Row), `string | null | undefined` (Insert/Update)
  - `evaluaciones_template.permite_recuperatorio: boolean` (Row), `boolean | undefined` (Insert/Update)

- [ ] **Step 1: Write migration SQL**

```sql
-- supabase/migrations/20261014000004_recuperatorios.sql

ALTER TABLE instituciones
  ADD COLUMN nota_aprobacion numeric DEFAULT 6;

ALTER TABLE evaluaciones
  ADD COLUMN permite_recuperatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN recuperatorio_de_evaluacion_id uuid REFERENCES evaluaciones(id) ON DELETE SET NULL;

ALTER TABLE evaluaciones_template
  ADD COLUMN permite_recuperatorio boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__supabase__apply_migration` with the SQL above.
Expected: migration applied without error.

- [ ] **Step 3: Update `src/types/database.ts`**

In `instituciones.Row` add: `nota_aprobacion: number`
In `instituciones.Insert` add: `nota_aprobacion?: number`
In `instituciones.Update` add: `nota_aprobacion?: number`

In `evaluaciones.Row` add: `permite_recuperatorio: boolean`, `recuperatorio_de_evaluacion_id: string | null`
In `evaluaciones.Insert` add: `permite_recuperatorio?: boolean`, `recuperatorio_de_evaluacion_id?: string | null`
In `evaluaciones.Update` add: `permite_recuperatorio?: boolean`, `recuperatorio_de_evaluacion_id?: string | null`

In `evaluaciones_template.Row` add: `permite_recuperatorio: boolean`
In `evaluaciones_template.Insert` add: `permite_recuperatorio?: boolean`
In `evaluaciones_template.Update` add: `permite_recuperatorio?: boolean`

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261014000004_recuperatorios.sql src/types/database.ts
git commit -m "feat: schema + types for recuperatorios"
```

---

### Task 2: API — permite_recuperatorio on evaluaciones + templates

**Files:**
- Modify: `src/app/api/v1/materias/[id]/evaluaciones/route.ts`
- Modify: `src/app/api/v1/evaluaciones/[id]/route.ts`
- Modify: `src/app/api/v1/instituciones/[id]/evaluaciones-template/route.ts`
- Modify: `src/app/api/v1/evaluaciones-template/[id]/route.ts`

**Interfaces:**
- Consumes: `evaluaciones.permite_recuperatorio` from Task 1.
- Produces:
  - `POST /api/v1/materias/[id]/evaluaciones` body accepts `permite_recuperatorio?: boolean`
  - `PATCH /api/v1/evaluaciones/[id]` body accepts `permite_recuperatorio?: boolean`
  - `POST /api/v1/instituciones/[id]/evaluaciones-template` body accepts `permite_recuperatorio?: boolean`; propagated instances carry the flag
  - `PATCH /api/v1/evaluaciones-template/[id]` body accepts `permite_recuperatorio?: boolean`

- [ ] **Step 1: `materias/[id]/evaluaciones/route.ts` — add field to CreateSchema**

In `CreateSchema`: add `permite_recuperatorio: z.boolean().default(false)`.
In the `insert` call: spread `permite_recuperatorio: parsed.data.permite_recuperatorio`.

- [ ] **Step 2: `evaluaciones/[id]/route.ts` — add field to PatchSchema**

In `PatchSchema`: add `permite_recuperatorio: z.boolean().optional()`.
`rest` spread already carries it into `updateData`.

- [ ] **Step 3: `instituciones/[id]/evaluaciones-template/route.ts` — add to template + propagation**

In `CreateSchema`: add `permite_recuperatorio: z.boolean().default(false)`.
In `insertData`: include `permite_recuperatorio: parsed.data.permite_recuperatorio`.
In `instances` map: include `permite_recuperatorio: parsed.data.permite_recuperatorio`.

- [ ] **Step 4: `evaluaciones-template/[id]/route.ts` — add to PatchSchema**

In `PatchSchema`: add `permite_recuperatorio: z.boolean().optional()`.
In the sync block: include `if (updateData.permite_recuperatorio !== undefined) syncFields.permite_recuperatorio = updateData.permite_recuperatorio`.

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/materias/\[id\]/evaluaciones/route.ts \
        src/app/api/v1/evaluaciones/\[id\]/route.ts \
        src/app/api/v1/instituciones/\[id\]/evaluaciones-template/route.ts \
        src/app/api/v1/evaluaciones-template/\[id\]/route.ts
git commit -m "feat: permite_recuperatorio en API evaluaciones + templates"
```

---

### Task 3: API — POST /evaluaciones/[id]/recuperatorio

**Files:**
- Create: `src/app/api/v1/evaluaciones/[id]/recuperatorio/route.ts`

**Interfaces:**
- Consumes: `evaluaciones.permite_recuperatorio`, `evaluaciones.recuperatorio_de_evaluacion_id` from Task 1; auth helpers.
- Produces:
  - `POST /api/v1/evaluaciones/[id]/recuperatorio` → `201 { data: { id, nombre, tipo, materia_id } }` on success
  - `409 { error: { message: "Ya existe un recuperatorio para esta evaluación" } }` if one exists
  - `422 { error: { message: "Esta evaluación no permite recuperatorio" } }` if flag is false
  - `422 { error: { message: "No se puede crear recuperatorio de un recuperatorio" } }` if `recuperatorio_de_evaluacion_id` is not null

- [ ] **Step 1: Create `src/app/api/v1/evaluaciones/[id]/recuperatorio/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { created, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()

  const { data: ev } = await supabase
    .from('evaluaciones')
    .select('id, nombre, tipo, materia_id, institucion_id, periodo_id, peso, orden, permite_recuperatorio, recuperatorio_de_evaluacion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!ev) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, ev.institucion_id, ['admin', 'docente']))
    return Err.forbidden()
  if (!ev.permite_recuperatorio)
    return Err.validation('Esta evaluación no permite recuperatorio')
  if (ev.recuperatorio_de_evaluacion_id)
    return Err.validation('No se puede crear recuperatorio de un recuperatorio')

  // Check if one already exists
  const { data: existing } = await supabase
    .from('evaluaciones')
    .select('id')
    .eq('recuperatorio_de_evaluacion_id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return Err.conflict('Ya existe un recuperatorio para esta evaluación')

  const { data: nuevo, error } = await supabase
    .from('evaluaciones')
    .insert({
      materia_id: ev.materia_id,
      institucion_id: ev.institucion_id,
      nombre: `${ev.nombre} — Recuperatorio`,
      tipo: 'recuperatorio' as const,
      peso: ev.peso,
      orden: ev.orden + 1,
      ...(ev.periodo_id ? { periodo_id: ev.periodo_id } : {}),
      recuperatorio_de_evaluacion_id: id,
      permite_recuperatorio: false,
    })
    .select('id, nombre, tipo, materia_id')
    .single()

  if (error) return Err.server(error.message)
  return created(nuevo)
}
```

Note: `Err.conflict` may not exist — if `Err` doesn't export `conflict`, use `Err.validation` with a 409 status, or add `conflict` to `@/lib/api`. Check existing `Err` exports first; if only `validation`, `notFound`, `forbidden`, `unauthorized`, `server` exist, use `Err.validation('Ya existe...')` instead.

- [ ] **Step 2: Check `@/lib/api` for available Err methods**

Read `src/lib/api.ts`. If `Err.conflict` doesn't exist, add:
```typescript
conflict: (message = 'Conflict') =>
  NextResponse.json({ error: { message } }, { status: 409 }),
```
Otherwise use as-is.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Browser verification**

POST to `/api/v1/evaluaciones/<id>/recuperatorio` for an evaluacion with `permite_recuperatorio = false` → expect 422.
POST for one with `permite_recuperatorio = true` → expect 201 with `{ id, nombre: "X — Recuperatorio", tipo: "recuperatorio" }`.
POST again for same id → expect 409 (or 422 if using Err.validation).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/evaluaciones/\[id\]/recuperatorio/route.ts src/lib/api.ts
git commit -m "feat: POST /evaluaciones/[id]/recuperatorio"
```

---

### Task 4: UI sheets — permite_recuperatorio checkbox

**Files:**
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/nueva-evaluacion-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/editar-evaluacion-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/evaluaciones-institucionales/nueva-template-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/evaluaciones-institucionales/editar-template-sheet.tsx`

**Interfaces:**
- Consumes: `permite_recuperatorio` field in API bodies (Task 2).
- Produces: all four sheets send `permite_recuperatorio: boolean` in POST/PATCH body.

For `editar-evaluacion-sheet.tsx`:
- `Evaluacion` interface: add `permite_recuperatorio: boolean`.
- `useState(evaluacion.permite_recuperatorio)` for local state.
- Reset on `handleOpen`.

For `editar-template-sheet.tsx`:
- `Template` interface: add `permite_recuperatorio: boolean`.
- Same pattern.

- [ ] **Step 1: Add checkbox to `nueva-evaluacion-sheet.tsx`**

Add `const [permiteRecuperatorio, setPermiteRecuperatorio] = useState(false)`.
Add to form (below tipo field):
```tsx
<label className="flex items-center gap-2 text-sm cursor-pointer">
  <input
    type="checkbox"
    checked={permiteRecuperatorio}
    onChange={e => setPermiteRecuperatorio(e.target.checked)}
    className="size-4 cursor-pointer accent-primary"
  />
  <span>Permite recuperatorio</span>
</label>
```
Add `permite_recuperatorio: permiteRecuperatorio` to JSON body.
Reset `permiteRecuperatorio` to `false` after submit.

- [ ] **Step 2: Add checkbox to `editar-evaluacion-sheet.tsx`**

Add `permite_recuperatorio: boolean` to `Evaluacion` interface.
Add `const [permiteRecuperatorio, setPermiteRecuperatorio] = useState(evaluacion.permite_recuperatorio)`.
Reset in `handleOpen`: `setPermiteRecuperatorio(evaluacion.permite_recuperatorio)`.
Add same checkbox JSX.
Add `permite_recuperatorio: permiteRecuperatorio` to PATCH body.

- [ ] **Step 3: Add checkbox to `nueva-template-sheet.tsx`**

Same as Step 1 pattern. Field name: `permite_recuperatorio`.

- [ ] **Step 4: Add checkbox to `editar-template-sheet.tsx`**

Add `permite_recuperatorio: boolean` to `Template` interface.
Same as Step 2 pattern.

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Browser verification**

Create evaluacion with "Permite recuperatorio" checked. Verify `permite_recuperatorio = true` saved in DB (check Supabase table or via API GET).

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/\[slug\]/materias/\[materia_id\]/evaluaciones/nueva-evaluacion-sheet.tsx \
        src/app/dashboard/\[slug\]/materias/\[materia_id\]/evaluaciones/editar-evaluacion-sheet.tsx \
        src/app/dashboard/\[slug\]/evaluaciones-institucionales/nueva-template-sheet.tsx \
        src/app/dashboard/\[slug\]/evaluaciones-institucionales/editar-template-sheet.tsx
git commit -m "feat: checkbox permite_recuperatorio en sheets"
```

---

### Task 5: UI — evaluaciones list + notas page enhancements

**Files:**
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx`
- Modify: `src/app/dashboard/[slug]/notas/[evaluacion_id]/page.tsx`
- Modify: `src/app/dashboard/[slug]/notas/[evaluacion_id]/notas-editor.tsx`

**Interfaces:**
- Consumes: `permite_recuperatorio`, `recuperatorio_de_evaluacion_id` from Task 1; `POST .../recuperatorio` from Task 3; `instituciones.nota_aprobacion` from Task 1.
- Produces:
  - Evaluaciones list row: "Recuperatorio de [original]" badge for linked evaluaciones; "Generar recuperatorio" button (client action) or "Ver recuperatorio" link for originals.
  - Notas editor: new `notaAprobacion: number | null` prop; new column header "Resultado"; `✓`/`✗`/`—` per row; "Generar recuperatorio" / "Ver recuperatorio" section below the table.

**Evaluaciones list changes in `page.tsx`:**

Add to the evaluaciones SELECT: `permite_recuperatorio, recuperatorio_de_evaluacion_id`.

Build a map of covered originals:
```typescript
// Map: original evaluacion id → recuperatorio evaluacion id
const recuperatorioMap = new Map<string, string>(
  (evaluaciones ?? [])
    .filter(ev => ev.recuperatorio_de_evaluacion_id)
    .map(ev => [ev.recuperatorio_de_evaluacion_id!, ev.id])
)
```

Pass `recuperatorioMap`, `slug`, `isAdminLevel` (already computed) to a new client component `GenerarRecuperatorioButton`.

**New file: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/generar-recuperatorio-button.tsx`**

```typescript
'use client'
// Props: evaluacionId: string; recuperatorioId: string | null; slug: string
// If recuperatorioId: render Button as Link to /dashboard/[slug]/notas/[recuperatorioId]
// If not: render Button that POSTs to /api/v1/evaluaciones/[evaluacionId]/recuperatorio
//   on success: toast.success("Recuperatorio generado") + router.refresh()
//   on error: toast.error(json.error?.message)
```

In `page.tsx` table row: for each `ev` with `permite_recuperatorio`, render `<GenerarRecuperatorioButton evaluacionId={ev.id} recuperatorioId={recuperatorioMap.get(ev.id) ?? null} slug={slug} />`.

Also add a badge for recuperatorio evaluaciones (those with `recuperatorio_de_evaluacion_id`):
```tsx
{ev.recuperatorio_de_evaluacion_id && (
  <Badge variant="secondary" className="text-xs">Recuperatorio</Badge>
)}
```

**Notas page changes in `notas/[evaluacion_id]/page.tsx`:**

Add to evaluacion SELECT: `permite_recuperatorio, recuperatorio_de_evaluacion_id`.
Fetch institution: `supabase.from('instituciones').select('nota_aprobacion').eq('id', inst.id).single()`.
Check if recuperatorio exists:
```typescript
const { data: recuperatorioExistente } = ev.permite_recuperatorio
  ? await supabase
      .from('evaluaciones')
      .select('id')
      .eq('recuperatorio_de_evaluacion_id', evaluacion_id)
      .is('deleted_at', null)
      .maybeSingle()
  : { data: null }
```

Pass to `NotasEditor`:
- `notaAprobacion: inst?.nota_aprobacion ?? null`
- `permiteRecuperatorio: evaluacion.permite_recuperatorio`
- `recuperatorioId: recuperatorioExistente?.id ?? null`
- `esRecuperatorio: !!evaluacion.recuperatorio_de_evaluacion_id`

**Notas editor changes in `notas-editor.tsx`:**

Add to `NotasEditorProps`:
```typescript
notaAprobacion: number | null
permiteRecuperatorio: boolean
recuperatorioId: string | null
esRecuperatorio: boolean
```

Add a "Resultado" column (last column in header):
- For each alumno: if `ausentes[id]` → `—`; if `valor !== ''` and `notaAprobacion !== null`: `valor_numerico < notaAprobacion` → `✗ Reprobado` (red); else `✓ Aprobado` (green); else `—`.

Below the table + export/save buttons row, add a recuperatorio section:
```tsx
{permiteRecuperatorio && !esRecuperatorio && (
  <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
    <p className="text-sm text-muted-foreground">
      {recuperatorioId
        ? 'Recuperatorio generado.'
        : `${countBelowThreshold} alumno${countBelowThreshold !== 1 ? 's' : ''} por debajo del umbral de aprobación.`}
    </p>
    {recuperatorioId
      ? <Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/notas/${recuperatorioId}`} />}>Ver recuperatorio</Button>
      : <GenerarRecuperatorioButton evaluacionId={evaluacionId} recuperatorioId={null} slug={slug} />
    }
  </div>
)}
{esRecuperatorio && (
  <p className="text-sm text-muted-foreground">Esta es la instancia de recuperatorio.</p>
)}
```

`countBelowThreshold` = count of alumnos where `!ausentes[id]` and `valores[id] !== ''` and `parseFloat(valores[id]) < notaAprobacion`.

Note: `GenerarRecuperatorioButton` is already created in Task 5's evaluaciones list section — import it here too. It needs `materiaId` only for the redirect after creation; pass `materiaId` as a prop.

- [ ] **Step 1: Add fields to evaluaciones SELECT in `evaluaciones/page.tsx`**

Add `permite_recuperatorio, recuperatorio_de_evaluacion_id` to `.select(...)`.
Build `recuperatorioMap` as described.

- [ ] **Step 2: Create `generar-recuperatorio-button.tsx`**

Client component. Props: `evaluacionId: string`, `recuperatorioId: string | null`, `slug: string`.
If `recuperatorioId`: render `<Button variant="outline" size="sm" render={<Link href={...} />}>Ver recuperatorio</Button>`.
If not: render `<Button variant="outline" size="sm">` that calls `POST /api/v1/evaluaciones/[evaluacionId]/recuperatorio`, on success shows toast + `router.refresh()`, on error shows toast.

- [ ] **Step 3: Add badge + button to evaluaciones list rows in `page.tsx`**

In each row: badge for `recuperatorio_de_evaluacion_id != null`; `<GenerarRecuperatorioButton>` for `permite_recuperatorio`.

- [ ] **Step 4: Enhance `notas/[evaluacion_id]/page.tsx`**

Add the SELECT fields and queries described above. Pass 4 new props to `NotasEditor`.

- [ ] **Step 5: Enhance `notas-editor.tsx`**

Add 4 props. Add "Resultado" column. Add recuperatorio section below the action buttons.

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 7: Browser verification**

1. Create evaluacion with `permite_recuperatorio = true`. Enter notas (some below 6). Save.
2. Notas page: "Resultado" column shows ✓/✗. Bottom section shows count + "Generar recuperatorio" button.
3. Click "Generar recuperatorio". Toast success. Page refreshes. Button changes to "Ver recuperatorio".
4. Click "Ver recuperatorio". Notas page for recuperatorio loads, shows "Esta es la instancia de recuperatorio."
5. Evaluaciones list: original shows "Generar/Ver recuperatorio"; recuperatorio row shows "Recuperatorio" badge.
6. Attempt to generate again (API level): expect 409/422.

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/\[slug\]/materias/\[materia_id\]/evaluaciones/ \
        src/app/dashboard/\[slug\]/notas/\[evaluacion_id\]/
git commit -m "feat: UI recuperatorios — lista, notas editor, generar button"
```
