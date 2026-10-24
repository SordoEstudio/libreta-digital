# Boletín Acuse de Recibo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the acuse de recibo digital feature so that responsables must confirm published periods before seeing the boletín, and admins can see who has or hasn't confirmed.

**Architecture:** Four tasks — (1) add the missing migration for the `boletin_acuses` table that already exists in the remote DB; (2) fix an inconsistency where the responsable gate page uses `cerrado_at` instead of `publicado_at` (with per-curso override support); (3) add the admin GET endpoint that the admin page will use; (4) build the admin acuses page with year/period selector, table, and responsable drawer.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres, TypeScript, Tailwind v4, base-ui components.

**Spec:** `docs/superpowers/specs/2026-10-21-boletin-acuse-design.md`

## What Already Exists (do NOT re-implement)

- `src/app/dashboard/[slug]/libreta/[alumno_id]/confirmar/page.tsx` — gate screen, uses `isPublicadoParaCurso` ✅
- `src/app/dashboard/[slug]/libreta/[alumno_id]/confirmar/confirmar-button.tsx` — client confirm button ✅
- `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx` — boletín, filters `isPublicadoParaCurso` for responsables ✅
- `src/app/api/v1/boletin-acuses/route.ts` — POST batch upsert for responsables (needs `publicado_at` fix in Task 2)
- `src/app/api/v1/boletin-acuses/admin/route.ts` — admin POST+DELETE for manual correction
- Sidebar Acuses link (admin-visible) ✅
- `boletin_acuses` table in the remote Supabase DB (no migration file — Task 1 creates it)

## Global Constraints

- `params` is always `Promise<{...}>` — must `await params` in every page and route.
- `createClient()` returns a Promise — always `await createClient()`.
- Never use ñ in Supabase `.select()` string literals — use `.select('*')` + cast instead.
- No `confirmado_por` type errors — the column exists in DB and in `src/types/database.ts`; include it in inserts only when the admin client is used.
- Tests only for pure helper functions in `src/lib/`. API routes and pages have no unit tests in this codebase.
- Admin pages use `createAdminClient()` for reads that join `personas` (RLS is own-only for personas).
- PowerShell corrupts ñ characters — if re-generating types, use Node.js script, not PowerShell.
- All API routes: `import { ok, created, Err } from '@/lib/api'`

## Review Focus

- **Gate loop:** If a responsable has a globally-published period where the curso has `abierto_at` set (per-curso "reopened"), the gate page should NOT redirect to `/confirmar` for that period (it's not actually published for that alumno's curso). The fix in Task 2 must check `isPublicadoParaCurso` not just `publicado_at IS NOT NULL`.
- **POST route period validation:** The POST `/api/v1/boletin-acuses` still validates `cerrado_at IS NOT NULL`; if a period is published (`publicado_at IS NOT NULL`) but not "closed" (this is allowed), the responsable could not confirm. Task 2 fixes this to `publicado_at IS NOT NULL`.
- **Admin GET scope:** The GET `/instituciones/[id]/boletin-acuses` must only return alumnos and acuses for the given institution. No cross-tenant data leakage.
- **Admin page empty states:** The admin page must gracefully handle: no alumnos enrolled, no responsables linked, no acuses recorded, period not yet published.
- **Drawer and table data consistency:** The responsable list in the drawer must match what the table shows (confirmed count). Both must come from the same fetched data, not separate requests.

---

### Task 1: Migration for `boletin_acuses`

**Files:**
- Create: `supabase/migrations/20261024000004_boletin_acuses.sql`

**Interfaces:**
- Consumes: nothing
- Produces: `boletin_acuses` table in migrations history; Tasks 2-4 can reference it safely in local dev

**Note:** The table already exists in the remote Supabase DB (the types were generated from it). This migration creates it for reproducibility in local dev and CI. Apply it with `mcp__supabase__apply_migration` using `ignoreDuplicates: true` equivalent — or simply mark it as "already applied" if needed.

- [ ] **Step 1: Write the migration SQL**

```sql
-- boletin_acuses: immutable receipt of boletín for a responsable per period
create table if not exists boletin_acuses (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references alumnos(id) on delete cascade,
  periodo_id     uuid not null references periodos(id) on delete cascade,
  persona_id     uuid not null references personas(id) on delete cascade,
  confirmado_por uuid references personas(id),
  confirmed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (alumno_id, periodo_id, persona_id)
);

create index if not exists boletin_acuses_alumno_idx  on boletin_acuses(alumno_id);
create index if not exists boletin_acuses_periodo_idx on boletin_acuses(periodo_id);
create index if not exists boletin_acuses_persona_idx on boletin_acuses(persona_id);

alter table boletin_acuses enable row level security;

-- Responsables: insert own acuse only for their linked alumnos
create policy if not exists "responsable inserta acuse de su alumno"
on boletin_acuses for insert
to authenticated
with check (
  persona_id = (
    select p.id from personas p
    join memberships m on m.persona_id = p.id
    where m.user_id = auth.uid()
    limit 1
  )
  and exists (
    select 1 from alumno_responsables ar
    where ar.alumno_id = boletin_acuses.alumno_id
      and ar.persona_id = boletin_acuses.persona_id
  )
);

-- Responsables: read their own acuses
create policy if not exists "responsable lee sus acuses"
on boletin_acuses for select
to authenticated
using (
  persona_id = (
    select p.id from personas p
    join memberships m on m.persona_id = p.id
    where m.user_id = auth.uid()
    limit 1
  )
);

-- Admin: read all acuses of their institution
create policy if not exists "admin lee acuses de su institucion"
on boletin_acuses for select
to authenticated
using (
  exists (
    select 1 from periodos p
    join años_lectivos al on al.id = p.año_lectivo_id
    join memberships m on m.institucion_id = al.institucion_id
    where p.id = boletin_acuses.periodo_id
      and m.user_id = auth.uid()
      and m.rol in ('admin', 'superadmin')
  )
);
```

- [ ] **Step 2: Save to file `supabase/migrations/20261024000004_boletin_acuses.sql`**

- [ ] **Step 3: Apply migration via `mcp__supabase__apply_migration`**

Name: `boletin_acuses`, SQL: file contents.

If the table already exists (remote DB), the `if not exists` guards make it idempotent.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261024000004_boletin_acuses.sql
git commit -m "chore: add migration for boletin_acuses table"
```

---

### Task 2: Fix gate page + POST route (`publicado_at` consistency)

**Files:**
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/page.tsx`
- Modify: `src/app/api/v1/boletin-acuses/route.ts`

**Interfaces:**
- Consumes: `isPublicadoParaCurso`, `PeriodoCierreOverride` from `@/lib/cierre-periodo`
- Produces: correct gate behavior (responsable redirected to `/confirmar` only for published-but-unconfirmed periods)

**Context:** The gate page currently uses `.not('cerrado_at', 'is', null)` — this must change to check `publicado_at` with per-curso override support, matching the logic in `confirmar/page.tsx`. The POST route validates `cerrado_at IS NOT NULL` when it should validate `publicado_at IS NOT NULL`.

- [ ] **Step 1: Update `libreta/[alumno_id]/page.tsx`**

Replace the `closedPeriods` query block (lines ~72-83) with:

```typescript
import { isPublicadoParaCurso, PeriodoCierreOverride } from '@/lib/cierre-periodo'

// Fetch all periods for the active year (including publicado_at)
const { data: allPeriods } = await supabase
  .from('periodos')
  .select('id, publicado_at')
  .eq('año_lectivo_id', añoLectivoId)
  .is('deleted_at', null)

// Fetch per-curso overrides so granular close state is respected
let overrideByPeriodo = new Map<string, PeriodoCierreOverride>()
if (cursoId) {
  const { data: overrides } = await supabase
    .from('periodo_cierre_cursos')
    .select('periodo_id, cerrado_at, publicado_at, abierto_at')
    .eq('curso_id', cursoId)
  overrideByPeriodo = new Map(
    (overrides ?? []).map(ov => [ov.periodo_id, ov])
  )
}

const publishedIds = (allPeriods ?? [])
  .filter(p => isPublicadoParaCurso(p.publicado_at, overrideByPeriodo.get(p.id) ?? null))
  .map(p => p.id)
```

Then update the rest of the function to use `publishedIds` instead of `closedIds`:
```typescript
if (publishedIds.length === 0) {
  redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
}

const { data: existingAcuses } = await supabase
  .from('boletin_acuses')
  .select('periodo_id')
  .eq('alumno_id', alumno_id)
  .eq('persona_id', session.persona_id)
  .in('periodo_id', publishedIds)

const confirmedIds = new Set((existingAcuses ?? []).map(a => a.periodo_id))
const hasPending = publishedIds.some(id => !confirmedIds.has(id))

if (hasPending) {
  redirect(`/dashboard/${slug}/libreta/${alumno_id}/confirmar`)
}

redirect(`/dashboard/${slug}/libreta/${alumno_id}/boletin`)
```

- [ ] **Step 2: Update `boletin-acuses/route.ts` POST period validation**

Find the admin query that validates period state (lines ~36-47). Change:
```typescript
.not('cerrado_at', 'is', null)
```
to:
```typescript
.not('publicado_at', 'is', null)
```

Also update the error message: `'Uno o más períodos no están cerrados'` → `'Uno o más períodos no están publicados'`

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/libreta/[alumno_id]/page.tsx src/app/api/v1/boletin-acuses/route.ts
git commit -m "fix: gate page and POST route use publicado_at instead of cerrado_at"
```

---

### Task 3: Admin GET endpoint for acuses

**Files:**
- Create: `src/app/api/v1/instituciones/[id]/boletin-acuses/route.ts`

**Interfaces:**
- Consumes: `Err`, `ok` from `@/lib/api`; `getSession`, `hasRole`, `isSuperadmin` from `@/lib/auth`; `createAdminClient` from `@/lib/supabase/admin`
- Produces: `GET /api/v1/instituciones/[id]/boletin-acuses?periodo_id=xxx`

Response shape:
```typescript
type AcuseRow = {
  alumno_id: string
  alumno_nombre: string
  alumno_apellido: string | null
  curso_nombre: string | null
  responsable_persona_id: string
  responsable_nombre: string
  responsable_apellido: string | null
  confirmed_at: string | null  // null = no acuse yet
}
```

Returns one row per (alumno, responsable) pair. The page aggregates.

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, hasRole, isSuperadmin } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, id, 'admin'))
    return Err.forbidden()

  const { searchParams } = new URL(request.url)
  const periodoId = searchParams.get('periodo_id')
  if (!periodoId) return Err.validation('periodo_id requerido')

  const admin = createAdminClient()

  // All alumnos in the institution enrolled in a course linked to the period's año
  // with their responsables, left-joined to acuses for this period
  const { data, error } = await admin
    .from('alumno_responsables')
    .select(`
      persona_id,
      personas!alumno_responsables_persona_id_fkey(nombre, apellido),
      alumnos!alumno_responsables_alumno_id_fkey(
        id,
        nombre,
        apellido,
        institucion_id,
        alumno_inscripciones(curso_id, activo, deleted_at, cursos(nombre))
      )
    `)
    .eq('alumnos.institucion_id', id)

  if (error) return Err.server(error.message)

  // Fetch acuses for this period
  const { data: acuses } = await admin
    .from('boletin_acuses')
    .select('alumno_id, persona_id, confirmed_at')
    .eq('periodo_id', periodoId)

  const acuseMap = new Map<string, string>() // `alumno_id:persona_id` → confirmed_at
  for (const a of (acuses ?? [])) {
    acuseMap.set(`${a.alumno_id}:${a.persona_id}`, a.confirmed_at)
  }

  // Shape into flat rows
  type AR = NonNullable<typeof data>[number]
  type AlumnoRaw = { id: string; nombre: string; apellido: string | null; institucion_id: string; alumno_inscripciones: Array<{ curso_id: string; activo: boolean; deleted_at: string | null; cursos: { nombre: string } | null }> }
  type PersonaRaw = { nombre: string; apellido: string | null }

  const rows: AcuseRow[] = []
  for (const ar of (data ?? []) as AR[]) {
    const alumno = ar.alumnos as unknown as AlumnoRaw | null
    if (!alumno || alumno.institucion_id !== id) continue
    const persona = ar.personas as unknown as PersonaRaw | null
    if (!persona) continue

    const activeInsc = (alumno.alumno_inscripciones ?? []).find(
      i => i.activo && !i.deleted_at
    )
    const cursoNombre = (activeInsc?.cursos as { nombre: string } | null)?.nombre ?? null

    rows.push({
      alumno_id: alumno.id,
      alumno_nombre: alumno.nombre,
      alumno_apellido: alumno.apellido,
      curso_nombre: cursoNombre,
      responsable_persona_id: ar.persona_id,
      responsable_nombre: persona.nombre,
      responsable_apellido: persona.apellido,
      confirmed_at: acuseMap.get(`${alumno.id}:${ar.persona_id}`) ?? null,
    })
  }

  return ok(rows)
}
```

**Note on the query:** Supabase joins with `!fkey_name` syntax (foreign key hint) to disambiguate multiple FK relationships. Since `alumno_responsables` has `alumno_id` → `alumnos` and `persona_id` → `personas`, use the hint syntax. If the join alias fails TypeScript, cast `as unknown as T`. Never use column names with ñ in `.select()` literals.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/instituciones/[id]/boletin-acuses/route.ts
git commit -m "feat: GET admin endpoint for boletin acuses by periodo"
```

---

### Task 4: Admin acuses page

**Files:**
- Create: `src/app/dashboard/[slug]/acuses/page.tsx`
- Create: `src/app/dashboard/[slug]/acuses/acuses-table.tsx` (client component)

**Interfaces:**
- Consumes: GET `/api/v1/instituciones/[id]/boletin-acuses?periodo_id=xxx` (from Task 3)
- Produces: admin page at `/dashboard/[slug]/acuses`

**Page layout:**

```
Acuses de boletín
[Año selector]  [Período selector]

Tabla:
| Alumno   | Curso  | Confirmados | Última confirmación |
|----------|--------|-------------|---------------------|
| López, A | 3° A   | 2/2 ✓       | 15/10/2026 14:30    |
| García, B| 3° B   | 0/1         | —                   |

[Exportar CSV]
```

Click on row → Sheet drawer showing responsables:
- Responsable: nombre apellido — confirmed_at formatted or "Sin confirmar"

- [ ] **Step 1: Build `acuses-table.tsx` (client component)**

Props:
```typescript
type Responsable = {
  persona_id: string
  nombre: string
  apellido: string | null
  confirmed_at: string | null
}

type AlumnoAcuse = {
  alumno_id: string
  alumno_nombre: string
  alumno_apellido: string | null
  curso_nombre: string | null
  responsables: Responsable[]
  confirmed_count: number
  total_count: number
  last_confirmed_at: string | null
}

interface Props {
  rows: AlumnoAcuse[]
  periodoNombre: string
}
```

The component:
- `'use client'`
- Uses `useState` for selected alumno (drawer state)
- Uses `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from `@/components/ui/sheet`
- Confirmed badge: `{confirmed_count}/{total_count}` — green if all confirmed, red if 0, amber if partial
- CSV export button: generate CSV inline from `rows` prop using a `createObjectURL` Blob
  - CSV columns: Alumno, Apellido, Curso, Responsable, Resp. Apellido, Período, Fecha confirmación

CSV export pattern:
```typescript
function exportCsv(rows: AlumnoAcuse[], periodoNombre: string) {
  const header = 'Alumno,Apellido,Curso,Responsable,Resp. Apellido,Período,Fecha confirmación'
  const lines = rows.flatMap(r =>
    r.responsables.map(resp => [
      r.alumno_nombre,
      r.alumno_apellido ?? '',
      r.curso_nombre ?? '',
      resp.nombre,
      resp.apellido ?? '',
      periodoNombre,
      resp.confirmed_at ? new Date(resp.confirmed_at).toLocaleString('es-AR') : 'Sin confirmar',
    ].map(v => `"${v.replace(/"/g, '""')}"`).join(','))
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `acuses-${periodoNombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Build `acuses/page.tsx` (server component)**

```typescript
type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ año?: string; periodo?: string }>
}
```

Server component flow:
1. `requireSession()` → admin check
2. Fetch `inst` by slug
3. Fetch años lectivos with their periodos (sorted)
4. Select `selectedAño` (from searchParams, fallback to activo, fallback to first)
5. Select `selectedPeriodo` (from searchParams, fallback to first of selectedAño)
6. If `selectedPeriodo` exists: fetch acuses via admin client (direct Supabase queries, same logic as the API route but inline — no fetch() to own API in server components)
7. Aggregate rows into `AlumnoAcuse[]`
8. Pass to `<AcusesTable rows={...} periodoNombre={selectedPeriodo?.nombre ?? ''} />`

Year and period selectors: `<Link>` based (update searchParams), using small pills/tabs pattern (see configuracion/page.tsx AñoSelector pattern).

Empty states:
- No años → "No hay años lectivos configurados."
- No períodos → "Este año no tiene períodos."
- Período no publicado → "Este período aún no fue publicado."
- No alumnos → "No hay alumnos inscriptos en este período."

**Important:** Fetch acuses data directly in the server component using `createAdminClient()`, NOT via `fetch('/api/v1/...')`. Server components do direct DB calls. The API route from Task 3 is for future use (e.g. client-side refresh).

Aggregation logic (same as Task 3 but inline in server):
```typescript
// Group alumno_responsables rows by alumno_id
const alumnoMap = new Map<string, AlumnoAcuse>()
for (const ar of alumnoResponsableRows) {
  if (!alumnoMap.has(ar.alumno_id)) {
    alumnoMap.set(ar.alumno_id, {
      alumno_id: ar.alumno_id,
      alumno_nombre: ar.alumno_nombre,
      alumno_apellido: ar.alumno_apellido,
      curso_nombre: ar.curso_nombre,
      responsables: [],
      confirmed_count: 0,
      total_count: 0,
      last_confirmed_at: null,
    })
  }
  const entry = alumnoMap.get(ar.alumno_id)!
  entry.total_count++
  entry.responsables.push({
    persona_id: ar.responsable_persona_id,
    nombre: ar.responsable_nombre,
    apellido: ar.responsable_apellido,
    confirmed_at: ar.confirmed_at,
  })
  if (ar.confirmed_at) {
    entry.confirmed_count++
    if (!entry.last_confirmed_at || ar.confirmed_at > entry.last_confirmed_at) {
      entry.last_confirmed_at = ar.confirmed_at
    }
  }
}
const tableRows = [...alumnoMap.values()].sort((a, b) =>
  (a.alumno_apellido ?? a.alumno_nombre).localeCompare(b.alumno_apellido ?? b.alumno_nombre, 'es')
)
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/acuses/page.tsx src/app/dashboard/[slug]/acuses/acuses-table.tsx
git commit -m "feat: admin acuses de boletin page with table and CSV export"
```
