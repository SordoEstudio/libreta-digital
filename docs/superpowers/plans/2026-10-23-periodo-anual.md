# Período Anual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed "Período Anual" per año lectivo with the same close/publish/notify lifecycle as regular periods, migrating existing `evaluaciones.periodo_id = NULL` rows to point to it, and block year closure when any period (regular or annual) is still open.

**Architecture:** New `tipo TEXT DEFAULT 'regular'` column on `periodos` distinguishes regular from the single annual period per year. The annual period reuses all existing period API routes and UI components — no new routes. A DB migration creates annual periods for existing years and updates null `periodo_id` evaluaciones. The boletín visibility filter simplifies: all notes (including annual) are gated uniformly by their period's `publicado_at`.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), TypeScript, Zod, shadcn/ui

**Spec:** Conversation context — 2026-10-23

## Global Constraints

- Annual period name is always `'Período Anual'` — fixed, not editable
- Annual period `orden = 9999` — always sorts last
- At most one `tipo = 'anual'` period per `año_lectivo_id` (enforced by unique partial index)
- Renaming a `tipo = 'anual'` period returns 409
- Year closure blocked if any period with `deleted_at IS NULL` lacks `cerrado_at` — includes the annual period
- New evaluaciones must never have `periodo_id = NULL` after this migration

## Review Focus

- **Evaluaciones with no materia or materia in deleted curso**: UPDATE in migration won't match them → remain NULL → application breaks if we enforce NOT NULL. Solution: add NOT NULL only after verifying 0 NULLs remain (assertion in Task 1 step 7).
- **activar_siguiente on annual period close**: cerrar route looks for `orden + 1 = 10000` — never exists → `siguiente_activado = false`. No change needed, but verify in Task 5 manual test.
- **Boletin for responsable with no active inscripcion**: `añoPublicadoAt` fetch path removed; annual notes now gated purely by `periodo_anual.publicado_at`. If the annual period was never published, responsable sees nothing — correct behavior.
- **Existing evaluaciones_template with NULL periodo_id**: migration must also update these rows (same JOIN chain).
- **Unique index conflict on idempotent re-run**: migration uses `WHERE NOT EXISTS` guard on INSERT — safe to re-run.

---

## File Map

| Action | File |
|---|---|
| Create | `supabase/migrations/20261023000001_periodo_anual.sql` |
| Modify | `src/app/api/v1/instituciones/[id]/periodos/route.ts` |
| Modify | `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/route.ts` |
| Modify | `src/app/api/v1/instituciones/[id]/anos-lectivos/[ano_id]/cerrar/route.ts` |
| Modify | `src/app/dashboard/[slug]/configuracion/periodos/nuevo-año-sheet.tsx` |
| Modify | `src/app/dashboard/[slug]/configuracion/periodos/page.tsx` |
| Modify | `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx` |

---

### Task 1: DB Migration — schema + data

**Files:**
- Create: `supabase/migrations/20261023000001_periodo_anual.sql`

**Interfaces:**
- Produces: `periodos.tipo TEXT NOT NULL DEFAULT 'regular' CHECK (tipo IN (''regular'', ''anual''))`
- Produces: `años_lectivos.cerrado_at TIMESTAMPTZ`, `años_lectivos.publicado_at TIMESTAMPTZ` (via `ADD COLUMN IF NOT EXISTS`)
- Produces: unique partial index `idx_periodos_anual_unico ON periodos(año_lectivo_id) WHERE tipo = 'anual' AND deleted_at IS NULL`
- Produces: one `tipo='anual'` period per existing `año_lectivo`
- Produces: `evaluaciones.periodo_id` and `evaluaciones_template.periodo_id` no longer NULL for any active row

- [ ] **Step 1: Write migration**

```sql
-- 1. Ensure cerrado_at / publicado_at exist on años_lectivos
ALTER TABLE años_lectivos
  ADD COLUMN IF NOT EXISTS cerrado_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publicado_at TIMESTAMPTZ;

-- 2. Add tipo to periodos
ALTER TABLE periodos
  ADD COLUMN tipo TEXT NOT NULL DEFAULT 'regular'
    CHECK (tipo IN ('regular', 'anual'));

-- 3. Unique constraint: one anual period per year
CREATE UNIQUE INDEX idx_periodos_anual_unico
  ON periodos(año_lectivo_id)
  WHERE tipo = 'anual' AND deleted_at IS NULL;

-- 4. Create annual period for every existing año_lectivo
INSERT INTO periodos (institucion_id, año_lectivo_id, nombre, orden, tipo, activo)
SELECT al.institucion_id, al.id, 'Período Anual', 9999, 'anual', false
FROM años_lectivos al
WHERE al.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM periodos p
    WHERE p.año_lectivo_id = al.id
      AND p.tipo = 'anual'
      AND p.deleted_at IS NULL
  );

-- 5. Migrate evaluaciones: NULL periodo_id → annual period of their año_lectivo
UPDATE evaluaciones e
SET periodo_id = p.id
FROM materias m
JOIN cursos c ON c.id = m.curso_id AND c.deleted_at IS NULL
JOIN periodos p ON p.año_lectivo_id = c.año_lectivo_id
  AND p.tipo = 'anual'
  AND p.deleted_at IS NULL
WHERE e.materia_id = m.id
  AND e.periodo_id IS NULL
  AND e.deleted_at IS NULL;

-- 6. Migrate evaluaciones_template: same
UPDATE evaluaciones_template et
SET periodo_id = p.id
FROM materias m
JOIN cursos c ON c.id = m.curso_id AND c.deleted_at IS NULL
JOIN periodos p ON p.año_lectivo_id = c.año_lectivo_id
  AND p.tipo = 'anual'
  AND p.deleted_at IS NULL
WHERE et.materia_id = m.id
  AND et.periodo_id IS NULL;
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
npx supabase db reset
```
or `npx supabase migration up` if incremental. Verify no errors.

- [ ] **Step 3: Assert 0 null periodo_id rows remain**

```sql
SELECT COUNT(*) FROM evaluaciones WHERE periodo_id IS NULL AND deleted_at IS NULL;
SELECT COUNT(*) FROM evaluaciones_template WHERE periodo_id IS NULL;
```

Expected: both return 0. If not 0, investigate before continuing — do NOT enforce NOT NULL yet.

- [ ] **Step 4: Enforce NOT NULL (only if step 3 returned 0)**

Add to migration after step 6:
```sql
ALTER TABLE evaluaciones ALTER COLUMN periodo_id SET NOT NULL;
ALTER TABLE evaluaciones_template ALTER COLUMN periodo_id SET NOT NULL;

ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_periodo_id_fkey;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_periodo_id_fkey
  FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE RESTRICT;

ALTER TABLE evaluaciones_template DROP CONSTRAINT evaluaciones_template_periodo_id_fkey;
ALTER TABLE evaluaciones_template ADD CONSTRAINT evaluaciones_template_periodo_id_fkey
  FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE RESTRICT;
```

- [ ] **Step 5: Verify annual periods exist**

```sql
SELECT al.nombre, p.nombre AS periodo_anual
FROM años_lectivos al
LEFT JOIN periodos p ON p.año_lectivo_id = al.id AND p.tipo = 'anual' AND p.deleted_at IS NULL
WHERE al.deleted_at IS NULL;
```

Expected: every año_lectivo has exactly one 'Período Anual' row.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261023000001_periodo_anual.sql
git commit -m "feat(db): add tipo to periodos, annual period, migrate eval periodo_id"
```

---

### Task 2: API — POST /periodos accepts `tipo`, PATCH blocks annual rename

**Files:**
- Modify: `src/app/api/v1/instituciones/[id]/periodos/route.ts` (lines 7-13 CreateSchema)
- Modify: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/route.ts` (PATCH handler)

**Interfaces:**
- Consumes: `periodos.tipo` from Task 1
- Produces: `POST /periodos` body accepts optional `tipo: 'regular' | 'anual'`, defaults `'regular'`
- Produces: `PATCH /periodos/{id}` returns 409 if `periodo.tipo === 'anual'`

- [ ] **Step 1: Update CreateSchema in POST route**

In `src/app/api/v1/instituciones/[id]/periodos/route.ts`, add to `CreateSchema`:
```typescript
tipo: z.enum(['regular', 'anual']).default('regular'),
```

- [ ] **Step 2: Update PATCH route to block annual rename**

In `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/route.ts`, after fetching the period and before the update:
```typescript
// Fetch tipo before update
const { data: existing } = await supabase
  .from('periodos')
  .select('tipo')
  .eq('id', periodo_id)
  .eq('institucion_id', institucion_id)
  .is('deleted_at', null)
  .single()
if (!existing) return Err.notFound('Período no encontrado')
if (existing.tipo === 'anual') return Err.conflict('El período anual no se puede renombrar')
```

- [ ] **Step 3: Verify POST accepts tipo**

Call `POST /api/v1/instituciones/{id}/periodos` with body `{ año_lectivo_id, nombre: 'test', orden: 1, tipo: 'regular' }` — expect 201.

Call with `tipo: 'anual'` for an año_lectivo that already has one — expect 409 (from DB unique constraint, not application code).

- [ ] **Step 4: Verify PATCH blocks annual rename**

Call `PATCH /api/v1/instituciones/{id}/periodos/{anual_id}` with `{ nombre: 'changed' }` — expect 409 "El período anual no se puede renombrar".

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/instituciones/[id]/periodos/route.ts \
        src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/route.ts
git commit -m "feat(api): accept tipo on period create, block annual period rename"
```

---

### Task 3: API — Guard year closure when periods are open

**Files:**
- Modify: `src/app/api/v1/instituciones/[id]/anos-lectivos/[ano_id]/cerrar/route.ts`

**Interfaces:**
- Consumes: `periodos.tipo`, `periodos.cerrado_at` from Task 1
- Produces: POST returns 409 `'Hay X período(s) abierto(s). Cerralos antes de cerrar el año.'` when any period (regular or anual) has `cerrado_at IS NULL`

- [ ] **Step 1: Write failing test scenario (manual)**

Create a year with one unclosed period. Attempt POST `/cerrar`. Expected: 409.

- [ ] **Step 2: Add guard before the update**

In `src/app/api/v1/instituciones/[id]/anos-lectivos/[ano_id]/cerrar/route.ts`, after the year fetch, before the `update`:

```typescript
const { data: periodosAbiertos, error: pErr } = await supabase
  .from('periodos')
  .select('id')
  .eq('año_lectivo_id', ano_id)
  .is('cerrado_at', null)
  .is('deleted_at', null)
if (pErr) return Err.server(pErr.message)
if (periodosAbiertos && periodosAbiertos.length > 0)
  return Err.conflict(`Hay ${periodosAbiertos.length} período(s) abierto(s). Cerralos antes de cerrar el año.`)
```

- [ ] **Step 3: Verify guard**

With periods open → POST returns 409 with the message above.
With all periods closed (including annual) → POST returns 200 `{ cerrado: true }`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/instituciones/[id]/anos-lectivos/[ano_id]/cerrar/route.ts
git commit -m "feat(api): block year closure when periods are open"
```

---

### Task 4: UI — nuevo-año-sheet auto-creates annual period

**Files:**
- Modify: `src/app/dashboard/[slug]/configuracion/periodos/nuevo-año-sheet.tsx`

**Interfaces:**
- Consumes: Task 2's `tipo` field in POST /periodos
- Produces: After creating regular periods from template, always creates one `tipo='anual'` period named `'Período Anual'` with `orden: 9999`

- [ ] **Step 1: Add annual period creation at end of handleSubmit**

In `nuevo-año-sheet.tsx`, after the `for` loop that creates template periods, add:

```typescript
await fetch(`/api/v1/instituciones/${instId}/periodos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    año_lectivo_id: añoId,
    nombre: 'Período Anual',
    orden: 9999,
    tipo: 'anual',
  }),
})
```

- [ ] **Step 2: Verify in browser**

Create a new año lectivo with bimestral template. Verify the year appears with 4 regular periods + 1 "Período Anual".

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/[slug]/configuracion/periodos/nuevo-año-sheet.tsx
git commit -m "feat(ui): auto-create annual period when creating año lectivo"
```

---

### Task 5: UI — periodos page shows annual period in separate section

**Files:**
- Modify: `src/app/dashboard/[slug]/configuracion/periodos/page.tsx`

**Interfaces:**
- Consumes: `periodos.tipo` from Task 1
- Produces: query selects `tipo` on periodos; annual period rendered in its own "Período anual" subsection below regular periods; rename button hidden for annual period

- [ ] **Step 1: Add `tipo` to the select**

In `page.tsx` line 41, update the periodos select to include `tipo`:

```typescript
.select('id, nombre, activo, cerrado_at, publicado_at, periodos(id, nombre, orden, activo, cerrado_at, publicado_at, tipo)')
```

- [ ] **Step 2: Update Periodo type**

Add `tipo: string` to the `Periodo` type at line 46.

- [ ] **Step 3: Split periodos into regular and annual**

Inside the `.map((año: Año) => {` block, split:

```typescript
const periodos = ((año.periodos ?? []) as Periodo[])
const periodosRegulares = periodos.filter(p => p.tipo !== 'anual').sort((a, b) => a.orden - b.orden)
const periodoAnual = periodos.find(p => p.tipo === 'anual') ?? null
```

- [ ] **Step 4: Render annual period section**

After the existing `periodosRegulares.map(...)` block, add a section for the annual period. It renders the same action buttons as regular periods (CerrarPeriodoSheet, ReabrirPeriodoButton, PublicarPeriodoButton, DespublicarPeriodoButton, NotificarPeriodoDialog) but WITHOUT the rename button. Use a visual separator or label "Período anual" to distinguish it.

Annual period label: `<span className="text-sm font-medium">{periodoAnual.nombre}</span>` — same styling, no rename button.

- [ ] **Step 5: Verify in browser**

Page shows regular periods list, then "Período Anual" in its own row below. Rename button absent for annual period. Close/publish/notify buttons present and functional.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/[slug]/configuracion/periodos/page.tsx
git commit -m "feat(ui): show annual period section in periodos page"
```

---

### Task 6: Boletin — simplify annual notes visibility

**Files:**
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx`

**Interfaces:**
- Consumes: Task 1's migration (all evaluaciones now have a periodo_id)
- Produces: `notasVisible` filter drops the `!ev?.periodo_id` special case; all notes gated uniformly by `ev.periodos?.publicado_at != null`; `añoPublicadoAt` fetch can be removed (kept only if needed for year-level badge)

- [ ] **Step 1: Update notasVisible filter (line 134–140)**

Replace:

```typescript
// Before
if (!ev?.periodo_id) return añoPublicadoAt != null
return ev.periodos?.publicado_at != null
```

With:

```typescript
// After — all notes (including annual) gated by their period's publicado_at
return ev.periodos?.publicado_at != null
```

- [ ] **Step 2: Remove añoPublicadoAt if unused**

Check if `añoPublicadoAt` is referenced anywhere else in the file. If only used in the filter, remove the fetch at lines 222–230. If used for the year badge elsewhere, keep the fetch.

- [ ] **Step 3: Verify in browser (responsable view)**

1. Annual period NOT published → responsable cannot see annual notes. ✓
2. Annual period published → responsable sees annual notes. ✓
3. Regular period published → responsable sees those notes unchanged. ✓

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx
git commit -m "fix(boletin): gate annual notes via periodo anual publicado_at"
```
