# Plantillas de dimensiones institucionales — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al admin definir plantillas de dimensiones a nivel institución y aplicarlas (copiando) a una materia o a todas las materias de un curso.

**Architecture:** Two new tables (`dimension_plantillas`, `dimension_plantilla_items`) + SQL RPC for atomic bulk apply. API routes follow existing `/instituciones/[id]/...` pattern. UI adds a config page + apply section in the existing dimensiones sheet + bulk apply button on the curso page.

**Tech Stack:** Next.js 16 App Router, Supabase (MCP apply + regen types), TypeScript strict, Zod 4, base-ui, Sonner, vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-dimension-plantillas-design.md`

## Global Constraints

- `const { id } = await params` — params is a Promise in Next.js 16
- `supabase db push` is FORBIDDEN — always use `mcp__supabase__apply_migration`
- After migration: always regen types via `mcp__supabase__generate_typescript_types`, update `src/types/database.ts`
- `createAdminClient()` for any cross-user persona reads; `createClient()` for own-institution reads with RLS
- Zod 4: `z.string().uuid()` requires RFC 4122 valid UUIDs — test UUIDs must use format `550e8400-e29b-41d4-a716-446655440001`
- `hasAnyRole(session, inst_id, ['admin'])` — array form, not string
- Soft delete: always filter `.is('deleted_at', null)`
- base-ui: `render={<Button />}` not `asChild`
- All API routes: return `Err.unauthorized()` if no session, `Err.forbidden()` if wrong role
- Admin only: create/delete/apply plantillas; docente: read only

## Review Focus

- Plantilla de otra institución aplicada a materia de otra institución → POST `/materias/[id]/dimensiones/aplicar-plantilla` must verify plantilla.institucion_id === materia.institucion_id
- Bulk apply con materia sin dimensiones existentes → DELETE no-ops, INSERT must still work
- Curso sin materias → bulk apply RPC returns 0, endpoint returns 200 with `materias_actualizadas: 0`
- Plantilla con soft delete ya aplicada → no affect on applied materias (correct, copy-on-apply)
- Aplicar plantilla cuando materia ya tiene dimensiones → existing deleted, new inserted atomically

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/20261015000005_dimension_plantillas.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: `dimension_plantillas` and `dimension_plantilla_items` tables in DB + TypeScript types for all subsequent tasks

- [ ] **Step 1: Write migration SQL**

Create file `supabase/migrations/20261015000005_dimension_plantillas.sql`:

```sql
-- dimension_plantillas
create table dimension_plantillas (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id),
  nombre         text not null check (char_length(nombre) between 1 and 100),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on dimension_plantillas (institucion_id);

-- dimension_plantilla_items
create table dimension_plantilla_items (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references dimension_plantillas(id) on delete cascade,
  nombre       text not null check (char_length(nombre) between 1 and 100),
  peso         numeric(5,2) check (peso is null or peso > 0),
  orden        integer not null default 0
);
create index on dimension_plantilla_items (plantilla_id);

-- RLS: dimension_plantillas
alter table dimension_plantillas enable row level security;

create policy "plantillas_select"
  on dimension_plantillas for select
  using (has_any_role(institucion_id, '{admin,docente}') or is_superadmin());

create policy "plantillas_insert"
  on dimension_plantillas for insert
  with check (has_any_role(institucion_id, '{admin}') or is_superadmin());

create policy "plantillas_update"
  on dimension_plantillas for update
  using (has_any_role(institucion_id, '{admin}') or is_superadmin());

create policy "plantillas_delete"
  on dimension_plantillas for delete
  using (has_any_role(institucion_id, '{admin}') or is_superadmin());

-- RLS: dimension_plantilla_items (via join to plantillas)
alter table dimension_plantilla_items enable row level security;

create policy "plantilla_items_select"
  on dimension_plantilla_items for select
  using (
    exists (
      select 1 from dimension_plantillas p
      where p.id = plantilla_id
        and (has_any_role(p.institucion_id, '{admin,docente}') or is_superadmin())
    )
  );

create policy "plantilla_items_insert"
  on dimension_plantilla_items for insert
  with check (
    exists (
      select 1 from dimension_plantillas p
      where p.id = plantilla_id
        and (has_any_role(p.institucion_id, '{admin}') or is_superadmin())
    )
  );

create policy "plantilla_items_delete"
  on dimension_plantilla_items for delete
  using (
    exists (
      select 1 from dimension_plantillas p
      where p.id = plantilla_id
        and (has_any_role(p.institucion_id, '{admin}') or is_superadmin())
    )
  );

-- RPC: bulk apply (security definer — app verifies auth before calling)
create or replace function aplicar_plantilla_a_curso(
  p_curso_id     uuid,
  p_plantilla_id uuid,
  p_institucion_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_materia_id uuid;
  v_count      integer := 0;
begin
  -- verify plantilla belongs to the stated institution and is not deleted
  if not exists (
    select 1 from dimension_plantillas
    where id = p_plantilla_id
      and institucion_id = p_institucion_id
      and deleted_at is null
  ) then
    raise exception 'plantilla_not_found';
  end if;

  for v_materia_id in
    select id from materias
    where curso_id = p_curso_id and deleted_at is null
  loop
    delete from materias_dimensiones where materia_id = v_materia_id;
    insert into materias_dimensiones (materia_id, nombre, peso, orden)
    select v_materia_id, nombre, peso, orden
    from dimension_plantilla_items
    where plantilla_id = p_plantilla_id
    order by orden;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
```

- [ ] **Step 2: Apply migration**

Call `mcp__supabase__apply_migration` with the SQL above.
Expected: migration applied successfully, no error.

- [ ] **Step 3: Regenerate TypeScript types**

Call `mcp__supabase__generate_typescript_types`.
Expected: types output includes `dimension_plantillas` and `dimension_plantilla_items` table definitions.

- [ ] **Step 4: Update `src/types/database.ts`**

Replace contents with the regenerated types.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261015000005_dimension_plantillas.sql src/types/database.ts
git commit -m "feat: dimension_plantillas schema + RPC + RLS + types"
```

---

### Task 2: Lib + schemas + tests

**Files:**
- Create: `src/lib/dimension-plantillas.ts`
- Create: `src/tests/lib/dimension-plantillas.test.ts`

**Interfaces:**
- Produces: `CreatePlantillaSchema`, `AplicarPlantillaSchema`, `CreatePlantillaInput`, `AplicarPlantillaInput` — consumed by Tasks 3, 5, 6

- [ ] **Step 1: Write failing tests**

Create `src/tests/lib/dimension-plantillas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { CreatePlantillaSchema, AplicarPlantillaSchema } from '@/lib/dimension-plantillas'

const UUID_A = '550e8400-e29b-41d4-a716-446655440001'

describe('CreatePlantillaSchema', () => {
  it('acepta datos válidos', () => {
    const r = CreatePlantillaSchema.safeParse({
      nombre: 'Oral + Escrito',
      items: [
        { nombre: 'Oral', peso: 30 },
        { nombre: 'Escrito', peso: 70 },
      ],
    })
    expect(r.success).toBe(true)
  })
  it('rechaza nombre vacío', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: '', items: [{ nombre: 'x', peso: 50 }] })
    expect(r.success).toBe(false)
  })
  it('rechaza nombre > 100 chars', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'x'.repeat(101), items: [{ nombre: 'x', peso: 50 }] })
    expect(r.success).toBe(false)
  })
  it('rechaza items vacíos', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'Plantilla', items: [] })
    expect(r.success).toBe(false)
  })
  it('acepta ítem con peso null (promedio directo)', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: 'x', peso: null }] })
    expect(r.success).toBe(true)
  })
  it('acepta ítem sin peso (promedio directo)', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: 'x' }] })
    expect(r.success).toBe(true)
  })
  it('rechaza ítem con peso negativo', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: 'x', peso: -5 }] })
    expect(r.success).toBe(false)
  })
  it('rechaza ítem con nombre vacío', () => {
    const r = CreatePlantillaSchema.safeParse({ nombre: 'P', items: [{ nombre: '', peso: 50 }] })
    expect(r.success).toBe(false)
  })
})

describe('AplicarPlantillaSchema', () => {
  it('acepta uuid válido', () => {
    const r = AplicarPlantillaSchema.safeParse({ plantilla_id: UUID_A })
    expect(r.success).toBe(true)
  })
  it('rechaza no-uuid', () => {
    const r = AplicarPlantillaSchema.safeParse({ plantilla_id: 'not-a-uuid' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/lib/dimension-plantillas.test.ts`
Expected: FAIL — `@/lib/dimension-plantillas` not found.

- [ ] **Step 3: Implement `src/lib/dimension-plantillas.ts`**

```typescript
import { z } from 'zod'

const ItemSchema = z.object({
  nombre: z.string().min(1).max(100),
  peso:   z.number().nonnegative().nullable().optional(),
}).strict()

export const CreatePlantillaSchema = z.object({
  nombre: z.string().min(1).max(100),
  items:  z.array(ItemSchema).min(1),
}).strict()

export type CreatePlantillaInput = z.infer<typeof CreatePlantillaSchema>

export const AplicarPlantillaSchema = z.object({
  plantilla_id: z.string().uuid(),
}).strict()

export type AplicarPlantillaInput = z.infer<typeof AplicarPlantillaSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/lib/dimension-plantillas.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dimension-plantillas.ts src/tests/lib/dimension-plantillas.test.ts
git commit -m "feat: dimension-plantillas Zod schemas + tests"
```

---

### Task 3: API — list and create plantillas

**Files:**
- Create: `src/app/api/v1/instituciones/[id]/dimension-plantillas/route.ts`

**Interfaces:**
- Consumes: `CreatePlantillaSchema`, `CreatePlantillaInput` from `@/lib/dimension-plantillas`
- Produces:
  - `GET /api/v1/instituciones/[id]/dimension-plantillas` → `{ data: PlantillaListItem[] }`
    where `PlantillaListItem = { id, nombre, created_at, items: { id, nombre, peso, orden }[] }`
  - `POST /api/v1/instituciones/[id]/dimension-plantillas` → 201 `{ data: PlantillaListItem }`

- [ ] **Step 1: Implement route**

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'
import { CreatePlantillaSchema } from '@/lib/dimension-plantillas'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: inst_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, inst_id, ['admin', 'docente']))
    return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dimension_plantillas')
    .select('id, nombre, created_at, dimension_plantilla_items(id, nombre, peso, orden)')
    .eq('institucion_id', inst_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return Err.server(error.message)

  const mapped = (data ?? []).map(p => ({
    id: p.id,
    nombre: p.nombre,
    created_at: p.created_at,
    items: ((p.dimension_plantilla_items ?? []) as Array<{ id: string; nombre: string; peso: number; orden: number }>)
      .sort((a, b) => a.orden - b.orden),
  }))

  return ok(mapped)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: inst_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, inst_id, ['admin']))
    return Err.forbidden()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id')
    .eq('id', inst_id)
    .is('deleted_at', null)
    .single()
  if (!inst) return Err.notFound()

  const body = await request.json().catch(() => null)
  const parsed = CreatePlantillaSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { nombre, items } = parsed.data

  const { data: plantilla, error: pErr } = await supabase
    .from('dimension_plantillas')
    .insert({ institucion_id: inst_id, nombre })
    .select('id, nombre, created_at')
    .single()

  if (pErr || !plantilla) return Err.server(pErr?.message ?? 'Error al crear plantilla')

  const itemsToInsert = items.map((item, idx) => ({
    plantilla_id: plantilla.id,
    nombre: item.nombre,
    peso: item.peso,
    orden: idx + 1,
  }))

  const { data: createdItems, error: iErr } = await supabase
    .from('dimension_plantilla_items')
    .insert(itemsToInsert)
    .select('id, nombre, peso, orden')

  if (iErr) return Err.server(iErr.message)

  return created({ ...plantilla, items: (createdItems ?? []).sort((a, b) => a.orden - b.orden) })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/instituciones/[id]/dimension-plantillas/route.ts
git commit -m "feat: API GET/POST /instituciones/[id]/dimension-plantillas"
```

---

### Task 4: API — delete plantilla

**Files:**
- Create: `src/app/api/v1/dimension-plantillas/[plantilla_id]/route.ts`

**Interfaces:**
- Produces: `DELETE /api/v1/dimension-plantillas/[plantilla_id]` → 200 `{ data: { id } }` (soft delete)

- [ ] **Step 1: Implement route**

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ plantilla_id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { plantilla_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: plantilla } = await supabase
    .from('dimension_plantillas')
    .select('id, institucion_id')
    .eq('id', plantilla_id)
    .is('deleted_at', null)
    .single()

  if (!plantilla) return Err.notFound('Plantilla no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, plantilla.institucion_id, ['admin']))
    return Err.forbidden()

  const { error } = await supabase
    .from('dimension_plantillas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', plantilla_id)

  if (error) return Err.server(error.message)

  return ok({ id: plantilla_id })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/dimension-plantillas/[plantilla_id]/route.ts
git commit -m "feat: API DELETE /dimension-plantillas/[plantilla_id]"
```

---

### Task 5: API — apply plantilla to materia

**Files:**
- Create: `src/app/api/v1/materias/[id]/dimensiones/aplicar-plantilla/route.ts`

**Interfaces:**
- Consumes: `AplicarPlantillaSchema` from `@/lib/dimension-plantillas`
- Produces: `POST /api/v1/materias/[id]/dimensiones/aplicar-plantilla`
  body: `{ plantilla_id: uuid }`
  → 200 `{ data: { dimensiones_creadas: number } }`

Logic: verify materia exists → verify plantilla belongs to same institution → DELETE existing dimensiones → INSERT plantilla items as new dimensiones.

- [ ] **Step 1: Implement route**

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { AplicarPlantillaSchema } from '@/lib/dimension-plantillas'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: materia_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('id, institucion_id')
    .eq('id', materia_id)
    .is('deleted_at', null)
    .single()

  if (!materia) return Err.notFound('Materia no encontrada')
  if (!isSuperadmin(session) && !hasAnyRole(session, materia.institucion_id, ['admin']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = AplicarPlantillaSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { plantilla_id } = parsed.data

  // Verify plantilla belongs to same institution
  const { data: plantilla } = await supabase
    .from('dimension_plantillas')
    .select('id, dimension_plantilla_items(id, nombre, peso, orden)')
    .eq('id', plantilla_id)
    .eq('institucion_id', materia.institucion_id)
    .is('deleted_at', null)
    .single()

  if (!plantilla) return Err.notFound('Plantilla no encontrada para esta institución')

  // Delete existing
  await supabase
    .from('materias_dimensiones')
    .delete()
    .eq('materia_id', materia_id)

  // Insert from plantilla
  const items = (plantilla.dimension_plantilla_items ?? []) as Array<{ nombre: string; peso: number; orden: number }>
  if (items.length === 0) return ok({ dimensiones_creadas: 0 })

  const toInsert = items
    .sort((a, b) => a.orden - b.orden)
    .map(item => ({
      materia_id,
      nombre: item.nombre,
      peso: item.peso,
      orden: item.orden,
    }))

  const { error, data: inserted } = await supabase
    .from('materias_dimensiones')
    .insert(toInsert)
    .select('id')

  if (error) return Err.server(error.message)

  return ok({ dimensiones_creadas: inserted?.length ?? 0 })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/materias/[id]/dimensiones/aplicar-plantilla/route.ts
git commit -m "feat: API POST /materias/[id]/dimensiones/aplicar-plantilla"
```

---

### Task 6: API — bulk apply plantilla to curso

**Files:**
- Create: `src/app/api/v1/cursos/[id]/dimensiones/aplicar-plantilla/route.ts`

**Interfaces:**
- Consumes: `AplicarPlantillaSchema` from `@/lib/dimension-plantillas`
- Produces: `POST /api/v1/cursos/[id]/dimensiones/aplicar-plantilla`
  → 200 `{ data: { materias_actualizadas: number } }`

Logic: verify curso + role → verify plantilla in same institution → call RPC `aplicar_plantilla_a_curso(curso_id, plantilla_id, institucion_id)` → return count.

- [ ] **Step 1: Implement route**

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'
import { AplicarPlantillaSchema } from '@/lib/dimension-plantillas'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: curso_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: curso } = await supabase
    .from('cursos')
    .select('id, institucion_id')
    .eq('id', curso_id)
    .is('deleted_at', null)
    .single()

  if (!curso) return Err.notFound('Curso no encontrado')
  if (!isSuperadmin(session) && !hasAnyRole(session, curso.institucion_id, ['admin']))
    return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = AplicarPlantillaSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { plantilla_id } = parsed.data

  const { data: count, error } = await supabase.rpc('aplicar_plantilla_a_curso', {
    p_curso_id: curso_id,
    p_plantilla_id: plantilla_id,
    p_institucion_id: curso.institucion_id,
  })

  if (error) {
    if (error.message.includes('plantilla_not_found')) return Err.notFound('Plantilla no encontrada para esta institución')
    return Err.server(error.message)
  }

  return ok({ materias_actualizadas: count ?? 0 })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/cursos/[id]/dimensiones/aplicar-plantilla/route.ts
git commit -m "feat: API POST /cursos/[id]/dimensiones/aplicar-plantilla (bulk RPC)"
```

---

### Task 7: UI — Plantillas config page + sidebar

**Files:**
- Create: `src/app/dashboard/[slug]/configuracion/dimension-plantillas/page.tsx`
- Create: `src/app/dashboard/[slug]/configuracion/dimension-plantillas/nueva-plantilla-sheet.tsx`
- Modify: `src/components/app-sidebar.tsx`

**Interfaces:**
- Produces: `/dashboard/[slug]/configuracion/dimension-plantillas` page, accessible only to admin

- [ ] **Step 1: Implement `nueva-plantilla-sheet.tsx` (client component)**

Sheet with:
- `nombre` text input
- Dynamic list of items (nombre + peso input per item, add/remove)
- Running total `{total}%` display
- Save button → POST to `/api/v1/instituciones/[instId]/dimension-plantillas`
- On success: `toast.success('Plantilla creada')`, `router.refresh()`, close sheet

Props: `instId: string`

- [ ] **Step 2: Implement page.tsx (server component)**

```typescript
// src/app/dashboard/[slug]/configuracion/dimension-plantillas/page.tsx
// requireSession() + hasRole admin check
// Fetch supabase: instituciones by slug, then GET /dimension-plantillas inline (direct supabase query)
// Render: list of plantillas (nombre, N ítems, delete button)
// NuevaPlantillaSheet button
// Delete: AlertDialog → DELETE /api/v1/dimension-plantillas/[id]
```

Fetch plantillas directly via supabase:
```typescript
const { data: plantillas } = await supabase
  .from('dimension_plantillas')
  .select('id, nombre, dimension_plantilla_items(id, nombre, peso, orden)')
  .eq('institucion_id', inst.id)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

- [ ] **Step 3: Add sidebar link**

In `src/components/app-sidebar.tsx`, within the "Configuración" group, after "Ev. institucionales":

```tsx
<SidebarMenuItem>
  <SidebarMenuButton
    render={<Link href={`/dashboard/${activeSlug}/configuracion/dimension-plantillas`} />}
    isActive={pathname.startsWith(`/dashboard/${activeSlug}/configuracion/dimension-plantillas`)}
  >
    <Layers />
    Dim. plantillas
  </SidebarMenuButton>
</SidebarMenuItem>
```

Import `Layers` from `lucide-react` (already imported in `dimensiones-materia-sheet.tsx`).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[slug]/configuracion/dimension-plantillas/ src/components/app-sidebar.tsx
git commit -m "feat: UI Plantillas de dimensiones — config page + sidebar"
```

---

### Task 8: UI — DimensionesMateriaSheet apply section

**Files:**
- Modify: `src/app/dashboard/[slug]/cursos/[curso_id]/dimensiones-materia-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx`

**Interfaces:**
- Consumes: `DimensionesMateriaSheet` current props `{ materiaId, materiaNombre, initialDimensiones }`
- Produces: modified `DimensionesMateriaSheet` props: `{ materiaId, materiaNombre, initialDimensiones, instId: string }`

- [ ] **Step 1: Modify DimensionesMateriaSheet**

Add `instId: string` to `Props`.

Add state:
```typescript
const [plantillas, setPlantillas] = useState<Array<{ id: string; nombre: string }>>([])
const [plantillaId, setPlantillaId] = useState('')
const [applying, setApplying] = useState(false)
```

On sheet open (`handleOpen(true)`): fetch `GET /api/v1/instituciones/${instId}/dimension-plantillas` and set plantillas.

At the bottom of the sheet content, after the "Agregar dimensión" form, add a section (only if `plantillas.length > 0`):

```tsx
<div className="flex flex-col gap-3 border-t pt-4">
  <p className="text-sm font-medium">Aplicar plantilla</p>
  <select value={plantillaId} onChange={e => setPlantillaId(e.target.value)} className="...">
    <option value="">Seleccioná una plantilla</option>
    {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
  </select>
  <AlertDialog>
    <AlertDialogTrigger render={<Button variant="secondary" disabled={!plantillaId || applying} />}>
      {applying ? <Loader2 ... /> : null}
      Aplicar
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>¿Reemplazar dimensiones?</AlertDialogTitle>
      <AlertDialogDescription>Esto eliminará las dimensiones actuales de la materia y las reemplazará con las de la plantilla.</AlertDialogDescription>
      <AlertDialogClose render={<Button variant="outline" />}>Cancelar</AlertDialogClose>
      <AlertDialogClose render={<Button onClick={handleApply} />}>Confirmar</AlertDialogClose>
    </AlertDialogContent>
  </AlertDialog>
</div>
```

`handleApply`: POST to `/api/v1/materias/${materiaId}/dimensiones/aplicar-plantilla` with `{ plantilla_id: plantillaId }` → on success: refresh dimensiones list by re-fetching GET dimensiones, toast.success, router.refresh().

Use base-ui's AlertDialog: `render={<Button>}` pattern (see existing usage in the codebase). The exact import path is `@base-ui-components/react/alert-dialog` — verify against existing imports in the repo before writing.

- [ ] **Step 2: Modify page.tsx — pass instId to DimensionesMateriaSheet**

Find the `<DimensionesMateriaSheet>` usage in `src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx` and add `instId={inst.id}`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/cursos/[curso_id]/dimensiones-materia-sheet.tsx src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx
git commit -m "feat: DimensionesMateriaSheet — apply plantilla section"
```

---

### Task 9: UI — Curso bulk apply button

**Files:**
- Create: `src/app/dashboard/[slug]/cursos/[curso_id]/aplicar-plantilla-curso-button.tsx`
- Modify: `src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx`

**Interfaces:**
- Produces: admin-only button on curso page that applies a plantilla to all materias of the curso

- [ ] **Step 1: Implement `aplicar-plantilla-curso-button.tsx` (client component)**

Props: `{ cursoId: string; instId: string }`

State: `plantillas` (fetched on mount from `GET /api/v1/instituciones/${instId}/dimension-plantillas`), `plantillaId`, `applying`, `open` (AlertDialog).

If no plantillas: render nothing (return null).

Renders a button "Aplicar plantilla al curso" (variant outline, size sm) → AlertDialog:
- Select de plantilla (mostrar nombre)
- Advertencia: "Las dimensiones de todas las materias del curso serán reemplazadas."
- Cancelar / Confirmar
- On confirm: POST `/api/v1/cursos/${cursoId}/dimensiones/aplicar-plantilla` with `{ plantilla_id }` → toast.success(`Plantilla aplicada a ${data.materias_actualizadas} materia(s)`) → router.refresh()

- [ ] **Step 2: Add to page.tsx**

In the "Materias" section header row (next to `NuevaMateriaSheet`, admin only):

```tsx
{isAdminLevel && (
  <>
    <NuevaMateriaSheet cursoId={curso_id} instId={inst.id} />
    <AplicarPlantillaCursoButton cursoId={curso_id} instId={inst.id} />
  </>
)}
```

Import `AplicarPlantillaCursoButton` from `./aplicar-plantilla-curso-button`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass, including dimension-plantillas tests from Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[slug]/cursos/[curso_id]/aplicar-plantilla-curso-button.tsx src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx
git commit -m "feat: curso page — aplicar plantilla a todas las materias"
```
