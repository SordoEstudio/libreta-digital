# Observaciones y Firmas del Boletín — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free-text observation per alumno per período (editable by admin/docente, read-only for responsable) and a print-only firmas section to the boletín, plus a Director/a configuration block.

**Architecture:** Four tasks — (1) DB migration for `observaciones_boletin` + new columns on `instituciones`; (2) POST API route for upsert/delete; (3) boletín page gains observaciones section + `ObservacionEditor` client component + `FirmasSection` client component; (4) configuración page gains Director/a form + the instituciones PATCH schema is extended.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres + RLS, TypeScript, Tailwind v4, base-ui / shadcn components (Button, Input, Textarea via `@/components/ui/*`), `sonner` toasts.

**Spec:** `docs/superpowers/specs/2026-10-24-observaciones-firmas-design.md`

## Global Constraints

- `params` is always `Promise<{...}>` — must `await params` in every page and route.
- `createClient()` returns a Promise — always `await createClient()`.
- Never use ñ in Supabase `.select()` string literals — use `.select('*')` or alias + cast.
- No tests for API routes or pages — only pure helpers in `src/lib/` are unit-tested. No new helpers needed here.
- All API routes: `import { ok, created, Err } from '@/lib/api'`
- PowerShell corrupts ñ — regenerate types via `mcp__supabase__generate_typescript_types`, not a shell command.
- HTTP verb for upserts: `POST` (project convention — not `PUT`).
- `router.refresh()` after any mutating client action (not `window.location.reload()`).
- Tailwind print utilities: `hidden print:block` / `print:hidden` — no custom CSS.

## Review Focus

- **Responsable sees observacion before period is published:** must filter using `isPublicadoParaCurso(p.publicado_at, override)` — same logic as notas visibility. Test: responsable on an unpublished period should see zero observaciones even if texto exists.
- **Empty texto = delete:** POST with `texto: ''` must DELETE the row, not upsert an empty string. API must `trim()` before deciding.
- **Docente loses curso access:** RLS policy denies write for a docente no longer assigned to any materia in the alumno's curso — UI should show read-only after losing access (no special client handling needed; API returns 403 and `toast.error` fires).
- **Alumno role visibility:** `isAlumnoOnly` users should see observaciones the same as responsables (published only, no edit button). The `canEditObservaciones` flag must not include `alumno` role.
- **`director_nombre` null:** if null, firmas section must not print a blank line — conditional render `{inst.director_nombre && <p>…</p>}`.

---

### Task 1: Migration + type regen

**Files:**
- Create: `supabase/migrations/20261024000005_observaciones_firmas.sql`
- Modify: `src/types/database.ts` (regenerate via MCP)

**Interfaces:**
- Produces: `observaciones_boletin` table + `instituciones.director_nombre` + `instituciones.director_cargo` available in all subsequent tasks.

- [ ] **Step 1: Write migration SQL**

```sql
-- observaciones_boletin: one observation per alumno per period
CREATE TABLE IF NOT EXISTS observaciones_boletin (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id   UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  periodo_id  UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL CHECK (char_length(texto) <= 1000),
  autor_id    UUID REFERENCES personas(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, periodo_id)
);
CREATE INDEX IF NOT EXISTS observaciones_boletin_alumno_idx  ON observaciones_boletin(alumno_id);
CREATE INDEX IF NOT EXISTS observaciones_boletin_periodo_idx ON observaciones_boletin(periodo_id);

ALTER TABLE observaciones_boletin ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "obs_admin" ON observaciones_boletin FOR ALL TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumnos a
    JOIN memberships m ON m.institucion_id = a.institucion_id
    WHERE a.id = observaciones_boletin.alumno_id
      AND m.persona_id = get_persona_id()
      AND m.rol IN ('admin', 'superadmin')
  ))
  WITH CHECK (EXISTS(
    SELECT 1 FROM alumnos a
    JOIN memberships m ON m.institucion_id = a.institucion_id
    WHERE a.id = observaciones_boletin.alumno_id
      AND m.persona_id = get_persona_id()
      AND m.rol IN ('admin', 'superadmin')
  ));

-- Docente: read + write for alumnos in their active courses
CREATE POLICY "obs_docente_write" ON observaciones_boletin FOR ALL TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumno_inscripciones ai
    JOIN materia_docentes md ON md.materia_id IN (
      SELECT id FROM materias WHERE curso_id = ai.curso_id AND deleted_at IS NULL
    )
    WHERE ai.alumno_id = observaciones_boletin.alumno_id
      AND ai.activo = TRUE AND ai.deleted_at IS NULL
      AND md.persona_id = get_persona_id()
  ))
  WITH CHECK (EXISTS(
    SELECT 1 FROM alumno_inscripciones ai
    JOIN materia_docentes md ON md.materia_id IN (
      SELECT id FROM materias WHERE curso_id = ai.curso_id AND deleted_at IS NULL
    )
    WHERE ai.alumno_id = observaciones_boletin.alumno_id
      AND ai.activo = TRUE AND ai.deleted_at IS NULL
      AND md.persona_id = get_persona_id()
  ));

-- Responsable: SELECT only for their linked alumnos
CREATE POLICY "obs_responsable_read" ON observaciones_boletin FOR SELECT TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumno_responsables ar
    WHERE ar.alumno_id = observaciones_boletin.alumno_id
      AND ar.persona_id = get_persona_id()
  ));

-- Alumno: SELECT only for their own record
CREATE POLICY "obs_alumno_read" ON observaciones_boletin FOR SELECT TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumnos a
    WHERE a.id = observaciones_boletin.alumno_id
      AND a.persona_id = get_persona_id()
  ));

-- Director fields on instituciones
ALTER TABLE instituciones
  ADD COLUMN IF NOT EXISTS director_nombre TEXT,
  ADD COLUMN IF NOT EXISTS director_cargo  TEXT DEFAULT 'Director/a';
```

- [ ] **Step 2: Save to `supabase/migrations/20261024000005_observaciones_firmas.sql`**

- [ ] **Step 3: Apply via `mcp__supabase__apply_migration`**

Name: `observaciones_firmas`. The `IF NOT EXISTS` / `IF NOT EXISTS` guards make it idempotent.

- [ ] **Step 4: Regenerate types via `mcp__supabase__generate_typescript_types`**

Write result to `src/types/database.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261024000005_observaciones_firmas.sql src/types/database.ts
git commit -m "chore: add migration for observaciones_boletin and director fields"
```

---

### Task 2: POST `/api/v1/observaciones-boletin`

**Files:**
- Create: `src/app/api/v1/observaciones-boletin/route.ts`

**Interfaces:**
- Consumes: `ok`, `created`, `Err` from `@/lib/api`; `getSession`, `hasRole`, `isSuperadmin` from `@/lib/auth`; `createClient` from `@/lib/supabase/server`.
- Produces: `POST /api/v1/observaciones-boletin` — upsert or delete an observacion.

Request body: `{ alumno_id: string, periodo_id: string, texto: string }`

Response:
- `texto.trim() !== ''` → upsert → `201 { observacion: { id, texto, updated_at } }`
- `texto.trim() === ''` → delete → `200 {}`
- 401 if unauthenticated, 403 if not admin/docente with access, 422 on validation failure, 404 if alumno not found.

- [ ] **Step 1: Create the route file**

Zod schema:
```typescript
const Body = z.object({
  alumno_id:  z.string().uuid(),
  periodo_id: z.string().uuid(),
  texto:      z.string().max(1000),
})
```

Handler flow:
1. `getSession()` → 401 if null.
2. Parse + validate body with `Body.safeParse`.
3. Fetch `alumno` from `alumnos` (select `id, institucion_id`) filtered by `alumno_id`. 404 if not found.
4. Check that caller is admin of `alumno.institucion_id` OR docente with a materia in the alumno's active curso:

```typescript
const isAdmin = isSuperadmin(session) || hasRole(session, alumno.institucion_id, 'admin')

let isDocente = false
if (!isAdmin && session.persona_id) {
  const { data: materiaDocente } = await supabase
    .from('materia_docentes')
    .select('id')
    .eq('persona_id', session.persona_id)
    .in('materia_id',
      supabase
        .from('materias')
        .select('id')
        .in('curso_id',
          supabase
            .from('alumno_inscripciones')
            .select('curso_id')
            .eq('alumno_id', parsed.data.alumno_id)
            .eq('activo', true)
            .is('deleted_at', null)
        )
        .is('deleted_at', null)
    )
    .limit(1)
    .maybeSingle()
  isDocente = !!materiaDocente
}

if (!isAdmin && !isDocente) return Err.forbidden()
```

5. If `parsed.data.texto.trim() === ''`:
   - DELETE from `observaciones_boletin` where `alumno_id` + `periodo_id`. Return `ok({})`.
6. Else:
   - Upsert `{ alumno_id, periodo_id, texto: parsed.data.texto.trim(), autor_id: session.persona_id, updated_at: new Date().toISOString() }` with `onConflict: 'alumno_id,periodo_id'`.
   - Return `created({ observacion: { id, texto, updated_at } })`.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/observaciones-boletin/route.ts
git commit -m "feat: POST /api/v1/observaciones-boletin upsert/delete"
```

---

### Task 3: Boletín — observaciones section + firmas

**Files:**
- Create: `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/observacion-editor.tsx`
- Create: `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/firmas-section.tsx`
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx`

**Interfaces:**
- Consumes: POST `/api/v1/observaciones-boletin` (Task 2); `isPublicadoParaCurso`, `PeriodoCierreOverride` from `@/lib/cierre-periodo` (already imported).
- Produces: visible observaciones section and print-only firmas section on the boletín page.

#### ObservacionEditor

- [ ] **Step 1: Create `observacion-editor.tsx`**

```typescript
'use client'

interface Props {
  alumnoId:      string
  periodoId:     string
  periodoNombre: string
  initialTexto:  string   // '' means no observation exists
  canEdit:       boolean
}
```

State: `editing: boolean`, `texto: string` (initialized to `initialTexto`), `saving: boolean`.

Render logic:
- If `!canEdit && !initialTexto`: return `null` (nothing to show).
- If `!canEdit && initialTexto`: show the text in a `<p>` (no edit controls).
- If `canEdit && !editing`:
  - If `initialTexto`: show text + "Editar" button (ghost/sm).
  - If `!initialTexto`: show muted "Sin observación" + "Agregar" button.
- If `editing`: textarea (`rows={4}`, `maxLength={1000}`, full width), char counter `{texto.length}/1000`, "Guardar" button + "Cancelar" button, and if `initialTexto` a "Eliminar" button.

`handleSave`:
```typescript
const res = await fetch('/api/v1/observaciones-boletin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ alumno_id: alumnoId, periodo_id: periodoId, texto }),
})
if (res.ok) { toast.success('Observación guardada'); router.refresh(); setEditing(false) }
else { const j = await res.json(); toast.error(j.error?.message ?? 'Error') }
```

`handleDelete`: same fetch with `texto: ''` → `toast.success('Observación eliminada')`.

#### FirmasSection

- [ ] **Step 2: Create `firmas-section.tsx`**

```typescript
'use client'

interface Props {
  directorNombre: string | null
  directorCargo:  string | null
  instNombre:     string
}
```

Renders `hidden print:block`. Date line: `new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })`. Two columns with underline — left: "Firma del/la Responsable", right: "Firma del/la {directorCargo ?? 'Director/a'}" + conditionally `directorNombre` + `"{directorCargo ?? 'Director/a'} · {instNombre}"`.

#### Page modifications

- [ ] **Step 3: Update `page.tsx`**

3a. Add `director_nombre, director_cargo` to the `inst` select (line ~19–22):
```typescript
.select('id, nombre, logo_rectangular_url, director_nombre, director_cargo')
```

3b. Move the curso/año fetch up, immediately after the `overrideByPeriodo` block (~line 149). Use `activaInsc` (already computed at line 135). Add periodos + observaciones queries:
```typescript
// Already have: activaInsc?.curso_id → cursoBoletin
let añoLectivoId: string | null = null
let cursoNombre: string | undefined
let añoNombre: string | undefined
if (activaInsc?.curso_id) {
  const { data: cursoRow } = await supabase
    .from('cursos').select('id, nombre, año_lectivo_id').eq('id', activaInsc.curso_id).single()
  cursoNombre = cursoRow?.nombre
  añoLectivoId = cursoRow?.año_lectivo_id ?? null
  if (añoLectivoId) {
    const { data: añoRow } = await supabase
      .from('años_lectivos').select('nombre').eq('id', añoLectivoId).single()
    añoNombre = añoRow?.nombre
  }
}

// All periods of the active year (for observaciones section)
type PeriodoBoletin = { id: string; nombre: string; orden: number; publicado_at: string | null }
const { data: periodosAno } = añoLectivoId
  ? await supabase
      .from('periodos')
      .select('id, nombre, orden, publicado_at')
      .eq('año_lectivo_id', añoLectivoId)
      .is('deleted_at', null)
      .order('orden')
  : { data: null }
const periodosBoletin: PeriodoBoletin[] = [...(periodosAno ?? [])].sort((a, b) => a.orden - b.orden)

// Observaciones for this alumno
const { data: observaciones } = await supabase
  .from('observaciones_boletin')
  .select('id, periodo_id, texto, updated_at')
  .eq('alumno_id', alumno_id)
const obsMap = new Map((observaciones ?? []).map(o => [o.periodo_id, o]))
```

3c. Remove the old `let cursoNombre`/`let añoNombre` declarations and the late fetch block at lines ~240–251 (the `if (inscripcion?.curso_id) { ... }` block). The `inscripcion` variable alias at line 240 is also removed since `activaInsc` is equivalent.

3d. Add `canEditObservaciones` flag after auth checks:
```typescript
const canEditObservaciones = isSuperadmin(session)
  || hasRole(session, inst.id, 'admin')
  || hasRole(session, inst.id, 'docente')
```

3e. In the JSX, after the notas table (before the footer), add the observaciones section:
```typescript
{periodosBoletin.length > 0 && (canEditObservaciones || obsMap.size > 0) && (
  <div className="mt-8">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 print:text-gray-600">
      Observaciones del docente
    </h2>
    <div className="flex flex-col gap-4">
      {periodosBoletin
        .filter(p => {
          if (canEditObservaciones) return true
          // responsable/alumno: only published periods with an observation
          const ov = overrideByPeriodo.get(p.id) ?? null
          return isPublicadoParaCurso(p.publicado_at, ov) && obsMap.has(p.id)
        })
        .map(p => {
          const obs = obsMap.get(p.id)
          return (
            <div key={p.id}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{p.nombre}</p>
              <ObservacionEditor
                alumnoId={alumno_id}
                periodoId={p.id}
                periodoNombre={p.nombre}
                initialTexto={obs?.texto ?? ''}
                canEdit={canEditObservaciones}
              />
            </div>
          )
        })
      }
    </div>
  </div>
)}
```

3f. After the observaciones section and before the footer, add firmas:
```typescript
<FirmasSection
  directorNombre={inst.director_nombre ?? null}
  directorCargo={inst.director_cargo ?? null}
  instNombre={inst.nombre}
/>
```

3g. Import the two new components at the top of the file.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/observacion-editor.tsx src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/firmas-section.tsx src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx
git commit -m "feat: add observaciones and firmas sections to boletin"
```

---

### Task 4: Configuración — Director/a block

**Files:**
- Modify: `src/app/api/v1/instituciones/[id]/route.ts` (extend PatchSchema)
- Create: `src/app/dashboard/[slug]/configuracion/director-form.tsx`
- Modify: `src/app/dashboard/[slug]/configuracion/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/v1/instituciones/[id]` (existing route, extended in this task).
- Produces: Director/a block visible in Configuración, saving to `instituciones.director_nombre` + `director_cargo`.

#### Extend PATCH schema

- [ ] **Step 1: Add `director_nombre` and `director_cargo` to `PatchSchema` in `instituciones/[id]/route.ts`**

In the existing `PatchSchema` (currently ends with `termino_recuperatorio`), add:
```typescript
director_nombre: z.string().max(200).nullable().optional(),
director_cargo:  z.string().max(100).optional(),
```

#### DirectorForm

- [ ] **Step 2: Create `director-form.tsx`**

```typescript
'use client'

interface Props {
  instId:          string
  directorNombre:  string
  directorCargo:   string
}
```

State: `nombre: string` (from `directorNombre`), `cargo: string` (from `directorCargo`), `loading: boolean`.

Two `Input` fields side by side (or stacked mobile): "Cargo" (placeholder "Director/a") + "Nombre" (placeholder "Lic. María García").

"Guardar" `Button` (outline, sm): disabled when `loading` or no change from initial values.

On save:
```typescript
const res = await fetch(`/api/v1/instituciones/${instId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    director_cargo: cargo.trim() || 'Director/a',
    director_nombre: nombre.trim() || null,
  }),
})
if (res.ok) { toast.success('Director/a actualizado'); router.refresh() }
else { const j = await res.json(); toast.error(j.error?.message ?? 'Error') }
```

#### Page modifications

- [ ] **Step 3: Update `configuracion/page.tsx`**

3a. Add `director_nombre, director_cargo` to the `inst` select (line ~35):
```typescript
.select('id, nombre, logo_cuadrado_url, logo_rectangular_url, termino_recuperatorio, director_nombre, director_cargo')
```

3b. Add import for `DirectorForm` at top.

3c. Add Director/a block after the "Terminología" block (around line 264–273), before the "Branding" block:
```tsx
<div className="flex items-center justify-between rounded-lg border px-4 py-3 gap-4">
  <div>
    <p className="text-sm font-medium">Director/a del establecimiento</p>
    <p className="text-xs text-muted-foreground">Aparece como firma en el boletín impreso</p>
  </div>
  <DirectorForm
    instId={inst.id}
    directorNombre={inst.director_nombre ?? ''}
    directorCargo={inst.director_cargo ?? 'Director/a'}
  />
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/instituciones/[id]/route.ts src/app/dashboard/[slug]/configuracion/director-form.tsx src/app/dashboard/[slug]/configuracion/page.tsx
git commit -m "feat: add Director/a configuration block and firmas support"
```
