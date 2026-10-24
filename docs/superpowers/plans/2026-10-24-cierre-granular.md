# Cierre Granular por Curso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-curso close/publish/reopen state within a period so admins can close early-finishing courses before others, and reopen individual courses to correct errors without affecting the institution.

**Architecture:** A new `periodo_cierre_cursos` table holds per-curso overrides for `cerrado_at`, `publicado_at`, and `abierto_at`; two pure helper functions resolve the effective state; all write-guards and boletín visibility checks consult the override alongside the period-level flag. The existing period-level state remains as the fallback/default — no migration of existing data needed.

**Tech Stack:** Next.js App Router (v16.3.6), Supabase (PostgreSQL), TypeScript, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-24-cierre-granular-design.md`

## Global Constraints

- Next.js version 16.3.6 — use `params: Promise<{...}>` and `await params` in all route handlers and page components.
- Supabase client: `createClient()` (server) from `@/lib/supabase/server`; never use browser client in route handlers.
- Auth pattern: `getSession()` → check `isSuperadmin` or `hasRole(..., 'admin')` before any mutation.
- Error helpers: `Err.unauthorized()`, `Err.forbidden()`, `Err.notFound()`, `Err.conflict()`, `Err.server()`, `ok()`, `noContent()` from `@/lib/api`.
- No ñ in Supabase `.select()` string literals — use `.select('*')` and cast when selecting columns with ñ.
- Soft-delete pattern: always filter `.is('deleted_at', null)` on all table reads.
- All new SQL migrations go in `supabase/migrations/` with filename `YYYYMMDDNNNNNN_<name>.sql`.
- Test runner: `npx vitest run` (all tests); single file: `npx vitest run src/tests/...`.

## Review Focus

1. **Global close then per-curso reopen**: period is globally closed; admin reopens curso C; a docente edits a nota in C — should succeed (not blocked). A docente in another curso D — should still be blocked. → covered in Task 1 tests.
2. **Per-curso close before global close**: admin closes curso C early while period is open; docente in C tries to submit notas — should be blocked. → covered in Task 1 tests.
3. **Boletín visibility race**: period is published globally; curso C is explicitly reopened (`abierto_at` set); responsable of alumno in C views boletín — should NOT see notes from that period. → covered in Task 5 tests.
4. **Bulk close idempotency**: calling `POST /periodos/:id/cerrar` twice — second call returns 409 at the period level but must not corrupt `periodo_cierre_cursos` rows created on the first call. → covered in Task 3.
5. **Curso with no inscription**: period has a curso with zero alumnos; bulk close still upserts a row for it; UI shows it as "Cerrado". → covered in Task 4 route tests.

---

### Task 1: DB migration + pure helper functions

**Files:**
- Create: `supabase/migrations/20261024000002_periodo_cierre_cursos.sql`
- Modify: `src/lib/cierre-periodo.ts`
- Modify: `src/tests/lib/cierre-periodo.test.ts`

**Interfaces:**
- Produces:
  - `PeriodoCierreOverride` type (exported from `src/lib/cierre-periodo.ts`)
  - `isCerradoParaCurso(periodoCerradoAt: string | null, override: PeriodoCierreOverride): boolean`
  - `isPublicadoParaCurso(periodoPublicadoAt: string | null, override: PeriodoCierreOverride): boolean`

- [ ] **Step 1: Write failing tests for `isCerradoParaCurso`**

```typescript
// src/tests/lib/cierre-periodo.test.ts — add to existing describe block:

describe('isCerradoParaCurso', () => {
  it('false when period open and no override', () => {
    expect(isCerradoParaCurso(null, null)).toBe(false)
  })
  it('true when period closed and no override', () => {
    expect(isCerradoParaCurso('2026-10-01T00:00:00Z', null)).toBe(true)
  })
  it('false when period closed but abierto_at is set (explicit reopen)', () => {
    expect(isCerradoParaCurso('2026-10-01T00:00:00Z', {
      cerrado_at: null, publicado_at: null, abierto_at: '2026-10-10T00:00:00Z'
    })).toBe(false)
  })
  it('true when period open but override has cerrado_at (early close)', () => {
    expect(isCerradoParaCurso(null, {
      cerrado_at: '2026-10-05T00:00:00Z', publicado_at: null, abierto_at: null
    })).toBe(true)
  })
  it('false when override has both cerrado_at and abierto_at (reopen wins)', () => {
    expect(isCerradoParaCurso('2026-10-01T00:00:00Z', {
      cerrado_at: '2026-10-01T00:00:00Z', publicado_at: null, abierto_at: '2026-10-10T00:00:00Z'
    })).toBe(false)
  })
})

describe('isPublicadoParaCurso', () => {
  it('false when period not published and no override', () => {
    expect(isPublicadoParaCurso(null, null)).toBe(false)
  })
  it('true when period published and no override', () => {
    expect(isPublicadoParaCurso('2026-10-02T00:00:00Z', null)).toBe(true)
  })
  it('false when period published but abierto_at overrides', () => {
    expect(isPublicadoParaCurso('2026-10-02T00:00:00Z', {
      cerrado_at: null, publicado_at: null, abierto_at: '2026-10-10T00:00:00Z'
    })).toBe(false)
  })
  it('true when period not published but override has publicado_at', () => {
    expect(isPublicadoParaCurso(null, {
      cerrado_at: '2026-10-05T00:00:00Z', publicado_at: '2026-10-06T00:00:00Z', abierto_at: null
    })).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run src/tests/lib/cierre-periodo.test.ts`  
Expected: FAIL — `isCerradoParaCurso is not a function`

- [ ] **Step 3: Add migration SQL**

In `supabase/migrations/20261024000002_periodo_cierre_cursos.sql`:

```sql
CREATE TABLE periodo_cierre_cursos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id    UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  curso_id      UUID NOT NULL REFERENCES cursos(id)  ON DELETE CASCADE,
  cerrado_at    TIMESTAMPTZ,
  publicado_at  TIMESTAMPTZ,
  abierto_at    TIMESTAMPTZ,
  UNIQUE(periodo_id, curso_id)
);
CREATE INDEX periodo_cierre_cursos_periodo_idx ON periodo_cierre_cursos(periodo_id);
CREATE INDEX periodo_cierre_cursos_curso_idx   ON periodo_cierre_cursos(curso_id);
```

Apply via MCP `mcp__supabase__apply_migration`.

- [ ] **Step 4: Implement helpers in `src/lib/cierre-periodo.ts`**

Add after the existing `isPeriodoCerrado` function:

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

Logic: `abierto_at` wins over everything (returns false); then check override's own `cerrado_at`/`publicado_at`; then fall back to period-level value.

- [ ] **Step 5: Run tests — verify they pass**

Run: `npx vitest run src/tests/lib/cierre-periodo.test.ts`  
Expected: all tests PASS including previous ones

- [ ] **Step 6: Regenerate TypeScript types**

Apply migration via MCP, then regenerate types with `mcp__supabase__generate_typescript_types` and write to `src/types/database.ts` via Node.js (not PowerShell — PowerShell mangles ñ).

```bash
node -e "
const fs = require('fs');
const p = '<tool-result-path>';
const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
const types = JSON.parse(arr[0].text).types;
fs.writeFileSync('src/types/database.ts', types, 'utf8');
"
```

- [ ] **Step 7: TypeScript check**

Run: `npx tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261024000002_periodo_cierre_cursos.sql \
        src/lib/cierre-periodo.ts \
        src/tests/lib/cierre-periodo.test.ts \
        src/types/database.ts
git commit -m "feat: add periodo_cierre_cursos table and per-curso state helpers"
```

---

### Task 2: New per-curso action routes

**Files:**
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/cursos/[curso_id]/cerrar/route.ts`
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/cursos/[curso_id]/publicar/route.ts`
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/cursos/[curso_id]/reabrir/route.ts`
- Create: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/cursos/[curso_id]/despublicar/route.ts`

**Interfaces:**
- Consumes: `PeriodoCierreOverride` type from Task 1; existing auth/api helpers.
- Produces: REST endpoints consumed by Task 6 UI buttons.

All four routes share the same Params type:
```typescript
type Params = { params: Promise<{ id: string; periodo_id: string; curso_id: string }> }
```

Auth for all four: `isSuperadmin(session) || hasRole(session, institucion_id, 'admin')`.

Verify ownership: confirm `periodos.institucion_id = id` AND `cursos` belongs to same institution (via `años_lectivos`).

- [ ] **Step 1: Implement `cerrar/route.ts`**

`POST` handler:
1. Verify session + admin auth.
2. Fetch period: `.select('id, cerrado_at').eq('id', periodo_id).eq('institucion_id', id)` → 404 if missing.
3. Verify curso belongs to same año_lectivo: `cursos.select('año_lectivo_id').eq('id', curso_id)`, then `años_lectivos.select('id').eq('id', año_lectivo_id).eq('institucion_id', id)` → 404 if mismatch.
4. Upsert `periodo_cierre_cursos`: `{ periodo_id, curso_id, cerrado_at: new Date().toISOString(), abierto_at: null }` with `onConflict: 'periodo_id,curso_id'`.
5. Return `ok({ cerrado: true })`.

- [ ] **Step 2: Implement `publicar/route.ts`**

Same auth + ownership check.  
Fetch override: `periodo_cierre_cursos` for `(periodo_id, curso_id)`.  
Guard: if override?.cerrado_at is null AND period.cerrado_at is null → `Err.validation('El curso no está cerrado')`.  
Upsert `{ publicado_at: new Date().toISOString(), abierto_at: null }`.  
Return `ok({ publicado: true })`.

- [ ] **Step 3: Implement `reabrir/route.ts`**

Upsert `{ cerrado_at: null, publicado_at: null, abierto_at: new Date().toISOString() }`.  
Return `ok({ reabierto: true })`.

- [ ] **Step 4: Implement `despublicar/route.ts`**

Fetch override. Guard: if override?.publicado_at is null AND period.publicado_at is null → `Err.conflict('El curso no está publicado')`.  
Upsert `{ publicado_at: null }` (keep cerrado_at, set abierto_at: null).  
Return `ok({ despublicado: true })`.

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`  
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/app/api/v1/instituciones/\[id\]/periodos/\[periodo_id\]/cursos/
git commit -m "feat: add per-curso cerrar/publicar/reabrir/despublicar routes"
```

---

### Task 3: Update bulk period routes to sync `periodo_cierre_cursos`

**Files:**
- Modify: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/cerrar/route.ts`
- Modify: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/publicar/route.ts`
- Modify: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/reabrir/route.ts`
- Modify: `src/app/api/v1/instituciones/[id]/periodos/[periodo_id]/despublicar/route.ts`

**Interfaces:**
- Consumes: `periodo_cierre_cursos` table from Task 1.

**Pattern for each route:** after the period-level update succeeds, fetch all `cursos` for the period's `año_lectivo_id`, then bulk-upsert `periodo_cierre_cursos`.

- [ ] **Step 1: Update `cerrar/route.ts`**

After the period-level `update({ cerrado_at })` succeeds (line 36-43 currently):

```typescript
// Fetch all cursos in this año_lectivo
const { data: cursos } = await supabase
  .from('cursos')
  .select('id')
  .eq('año_lectivo_id', periodo.año_lectivo_id)
  .is('deleted_at', null)

if (cursos && cursos.length > 0) {
  await supabase
    .from('periodo_cierre_cursos')
    .upsert(
      cursos.map(c => ({
        periodo_id,
        curso_id: c.id,
        cerrado_at: new Date().toISOString(),
        abierto_at: null,
      })),
      { onConflict: 'periodo_id,curso_id', ignoreDuplicates: false }
    )
}
```

- [ ] **Step 2: Update `publicar/route.ts`**

After period-level `update({ publicado_at })` succeeds: same pattern, upsert `{ publicado_at: new Date().toISOString(), abierto_at: null }` for all cursos.

Fetch `año_lectivo_id` from the period (add it to the existing `select('id, cerrado_at, publicado_at')`).

- [ ] **Step 3: Update `reabrir/route.ts`**

After clearing period-level `cerrado_at`: delete all `periodo_cierre_cursos` rows for this `periodo_id`.

```typescript
await supabase
  .from('periodo_cierre_cursos')
  .delete()
  .eq('periodo_id', periodo_id)
```

- [ ] **Step 4: Update `despublicar/route.ts`**

After clearing period-level `publicado_at`: upsert `{ publicado_at: null }` for all existing `periodo_cierre_cursos` rows for this `periodo_id` (don't create new rows, only update existing ones).

```typescript
await supabase
  .from('periodo_cierre_cursos')
  .update({ publicado_at: null })
  .eq('periodo_id', periodo_id)
```

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`  
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/app/api/v1/instituciones/\[id\]/periodos/\[periodo_id\]/cerrar/route.ts \
        src/app/api/v1/instituciones/\[id\]/periodos/\[periodo_id\]/publicar/route.ts \
        src/app/api/v1/instituciones/\[id\]/periodos/\[periodo_id\]/reabrir/route.ts \
        src/app/api/v1/instituciones/\[id\]/periodos/\[periodo_id\]/despublicar/route.ts
git commit -m "feat: sync periodo_cierre_cursos on bulk period close/publish/reopen/unpublish"
```

---

### Task 4: Update write-side check points (notas, evaluaciones, asistencia)

**Files:**
- Modify: `src/app/api/v1/notas/bulk/route.ts`
- Modify: `src/app/api/v1/notas/[id]/route.ts`
- Modify: `src/app/api/v1/evaluaciones/[id]/route.ts`
- Modify: `src/app/api/v1/materias/[id]/evaluaciones/route.ts`
- Modify: `src/app/api/v1/materias/[id]/asistencia/route.ts`

**Interfaces:**
- Consumes: `isCerradoParaCurso`, `PeriodoCierreOverride` from Task 1; `periodo_cierre_cursos` table.

In every file, the pattern is: obtain `curso_id`, then fetch both period state and override, then call `isCerradoParaCurso`.

**How to get `curso_id` per file:**

- `notas/bulk/route.ts` (line 34): change `.select('id, nombre, tipo, periodo_id, institucion_id, materias(materias_catalogo(nombre), cursos(nome))')` → add `cursos(id)` to the materias join. `curso_id = (evaluacion.materias as any).cursos?.id`
- `notas/[id]/route.ts` (line 22): change `evaluaciones.select('periodo_id')` → `select('periodo_id, materias(curso_id)')`. `curso_id = (evalForLock.materias as any)?.curso_id`
- `evaluaciones/[id]/route.ts` (line 24): `mat.curso_id` already available — just use it.
- `materias/[id]/evaluaciones/route.ts` (line 57): `materia.curso_id` already available.
- `materias/[id]/asistencia/route.ts` (line 22): add `curso_id` to `resolveMateria` select → `select('id, institucion_id, curso_id')`.

**Override fetch (same pattern in all five files):**

```typescript
// After obtaining periodo_id and curso_id:
const { data: cierreOverride } = await supabase
  .from('periodo_cierre_cursos')
  .select('cerrado_at, publicado_at, abierto_at')
  .eq('periodo_id', evaluacion.periodo_id)   // substitute correct var name
  .eq('curso_id', curso_id)
  .maybeSingle()
if (isCerradoParaCurso(periodo?.cerrado_at ?? null, cierreOverride)) return Err.conflict('Período cerrado')
```

- [ ] **Step 1: Update `notas/bulk/route.ts`**

Change the materias join to include `cursos(id)`. After the period fetch, add the override fetch. Replace `isPeriodoCerrado(periodo?.cerrado_at)` with `isCerradoParaCurso(periodo?.cerrado_at ?? null, cierreOverride)`. Import `isCerradoParaCurso, PeriodoCierreOverride`.

- [ ] **Step 2: Update `notas/[id]/route.ts`**

In `evalForLock` fetch, change `select('periodo_id')` → `select('periodo_id, materias(curso_id)')`. Add override fetch using `evalForLock.periodo_id` and `(evalForLock.materias as any)?.curso_id`. Replace `isPeriodoCerrado`.

- [ ] **Step 3: Update `evaluaciones/[id]/route.ts`** (PATCH only)

`mat.curso_id` is already available (line 40). Add override fetch. Replace `isPeriodoCerrado`. Import new helpers.

- [ ] **Step 4: Update `materias/[id]/evaluaciones/route.ts`** (POST only)

`materia.curso_id` available (line 57). After `resolvedPeriodoId` is set, fetch periodo cerrado_at AND override. Use `isCerradoParaCurso`. The existing check is at line ~87 (`if (periodoAnual)`) — add override check there; for the explicit `periodo_id` path, add the same override check pattern.

- [ ] **Step 5: Update `materias/[id]/asistencia/route.ts`** (POST only)

Add `curso_id` to `resolveMateria` select. After period check (line 83-87), add override fetch using `parsed.data.periodo_id` and `materia.curso_id`. Replace `isPeriodoCerrado`.

- [ ] **Step 6: TypeScript check**

Run: `npx tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`  
Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add src/app/api/v1/notas/ \
        src/app/api/v1/evaluaciones/\[id\]/route.ts \
        src/app/api/v1/materias/\[id\]/evaluaciones/route.ts \
        src/app/api/v1/materias/\[id\]/asistencia/route.ts
git commit -m "feat: use per-curso cierre check in nota/evaluacion/asistencia write routes"
```

---

### Task 5: Update read-side — cuaderno, notas page, boletín

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`
- Modify: `src/app/dashboard/[slug]/notas/[evaluacion_id]/page.tsx`
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx`
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/confirmar/page.tsx`

**Interfaces:**
- Consumes: `isCerradoParaCurso`, `isPublicadoParaCurso`, `PeriodoCierreOverride` from Task 1.

**Pattern for server components:** after fetching the period, add one more query for `periodo_cierre_cursos` and pass the override to the helper.

- [ ] **Step 1: Update `cuaderno/page.tsx`**

`selectedMateria.cursoId` is available. After `selectedPeriodo` is resolved (around line 112), fetch override:

```typescript
let cierreOverride: PeriodoCierreOverride = null
if (selectedPeriodo && selectedMateria.cursoId) {
  const { data: ov } = await supabase
    .from('periodo_cierre_cursos')
    .select('cerrado_at, publicado_at, abierto_at')
    .eq('periodo_id', selectedPeriodo.id)
    .eq('curso_id', selectedMateria.cursoId)
    .maybeSingle()
  cierreOverride = ov ?? null
}
const periodoCerrado = selectedPeriodo
  ? isCerradoParaCurso(selectedPeriodo.cerrado_at, cierreOverride)
  : false
```

Import `isCerradoParaCurso, PeriodoCierreOverride` from `@/lib/cierre-periodo`.

- [ ] **Step 2: Update `notas/[evaluacion_id]/page.tsx`**

The page resolves `isCerrado` at line 132. `evaluacion.materias` already has `curso_id` (from `select('*')` on materias). After fetching `evalPeriodo`, add:

```typescript
const { data: cierreOv } = evalPeriodo && evaluacion.materias?.curso_id
  ? await supabase
      .from('periodo_cierre_cursos')
      .select('cerrado_at, publicado_at, abierto_at')
      .eq('periodo_id', evalPeriodo.id)
      .eq('curso_id', evaluacion.materias.curso_id)
      .maybeSingle()
  : { data: null }
const isCerrado = isCerradoParaCurso(evalPeriodo?.cerrado_at ?? null, cierreOv ?? null)
```

Fetch `curso_id` from `materias`: change the evaluacion select to explicitly include `materias(curso_id, ...)` if it isn't already.

- [ ] **Step 3: Update `libreta/[alumno_id]/boletin/page.tsx`**

The alumno's active `curso_id` is available (from `alumno_inscripciones`). After fetching `notas`, fetch all relevant overrides:

```typescript
const activaInsc = (alumno.alumno_inscripciones as Array<{curso_id: string; activo: boolean; deleted_at: string|null}>)
  .find(i => i.activo && !i.deleted_at)
const cursoBoletin = activaInsc?.curso_id ?? null

// Fetch overrides for this curso across all periods
const { data: overrides } = cursoBoletin
  ? await supabase
      .from('periodo_cierre_cursos')
      .select('periodo_id, cerrado_at, publicado_at, abierto_at')
      .eq('curso_id', cursoBoletin)
  : { data: null }

const overrideByPeriodo = new Map(
  (overrides ?? []).map(ov => [ov.periodo_id, ov])
)
```

Then update the `notasVisible` filter (currently line ~134):

```typescript
const notasVisible = isResponsableOnly
  ? (notas ?? []).filter(n => {
      const ev = n.evaluaciones as Evaluacion | null
      if (!ev?.periodo_id || !ev?.periodos) return false
      const ov = overrideByPeriodo.get(ev.periodo_id) ?? null
      return isPublicadoParaCurso(ev.periodos.publicado_at, ov)
    })
  : (notas ?? [])
```

Import `isPublicadoParaCurso, PeriodoCierreOverride` from `@/lib/cierre-periodo`.

- [ ] **Step 4: Update `libreta/[alumno_id]/confirmar/page.tsx`**

Read the current file to understand its publicado_at check, then apply the same override pattern as boletin (fetch overrides for alumno's curso_id, apply `isPublicadoParaCurso`).

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`  
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/\[slug\]/cuaderno/page.tsx \
        src/app/dashboard/\[slug\]/notas/\[evaluacion_id\]/page.tsx \
        src/app/dashboard/\[slug\]/libreta/\[alumno_id\]/boletin/page.tsx \
        src/app/dashboard/\[slug\]/libreta/\[alumno_id\]/confirmar/page.tsx
git commit -m "feat: apply per-curso cierre state in cuaderno, notas page, and boletin"
```

---

### Task 6: UI — per-curso status panel in Configuración > Períodos

**Files:**
- Create: `src/app/dashboard/[slug]/configuracion/periodos/cierre-granular-table.tsx`
- Modify: `src/app/dashboard/[slug]/configuracion/periodos/page.tsx`

**Interfaces:**
- Consumes: new API routes from Task 2; `PeriodoCierreOverride` shape for display.
- Produces: UI visible to admin in periodos page.

- [ ] **Step 1: Create `cierre-granular-table.tsx`** (client component)

Props:
```typescript
interface Props {
  instId: string
  periodoId: string
  cursos: Array<{
    id: string
    nombre: string
    override: {
      cerrado_at: string | null
      publicado_at: string | null
      abierto_at: string | null
    } | null
  }>
  periodoCerradoAt: string | null
  periodoPublicadoAt: string | null
  slug: string
}
```

Compute effective state per curso using `isCerradoParaCurso` and `isPublicadoParaCurso` (import from `@/lib/cierre-periodo` — these are pure functions, safe in client components).

Display table with columns: Curso, Estado (badge: "Publicado" / "Cerrado" / "Abierto"), Acciones (buttons calling the per-curso routes, each with `router.refresh()` on success and `toast.error()` on failure).

Action buttons per state:
- Abierto: [Cerrar]
- Cerrado: [Publicar] [Reabrir]
- Publicado: [Despublicar] [Reabrir]

Each button calls `fetch(...)` with the appropriate per-curso route and uses `toast.success` / `toast.error`.

- [ ] **Step 2: Update `configuracion/periodos/page.tsx`**

The page already fetches `periodos` with `cerrado_at, publicado_at`. For each period, additionally fetch:
- `cursos` for the period's `año_lectivo_id` (the page has año data)
- `periodo_cierre_cursos` for that `periodo_id`

Build the `cursos` array with overrides merged in, then render `<CierreGranularTable>` under each period card.

The page currently imports `CerrarPeriodoSheet`, `ReabrirPeriodoButton`, etc. — keep all of those; the new table is an *addition* below the existing buttons, not a replacement.

Fetch overrides:
```typescript
const { data: cierresCursos } = await supabase
  .from('periodo_cierre_cursos')
  .select('periodo_id, curso_id, cerrado_at, publicado_at, abierto_at')
  .in('periodo_id', años.flatMap(a => (a.periodos as Periodo[]).map(p => p.id)))
```

Build a lookup: `Map<periodo_id, Map<curso_id, override>>`.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`  
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/\[slug\]/configuracion/periodos/cierre-granular-table.tsx \
        src/app/dashboard/\[slug\]/configuracion/periodos/page.tsx
git commit -m "feat: add per-curso cierre status table in periodos configuracion page"
```
