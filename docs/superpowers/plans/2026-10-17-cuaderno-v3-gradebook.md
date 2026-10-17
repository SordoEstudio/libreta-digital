# Cuaderno v3 — Gradebook unificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Single cuaderno screen shows all evals (libreta + referencia + recuperatorios) inline editable, auto-selects first materia + active período on load.

**Architecture:** Server component `cuaderno/page.tsx` fetches all data; passes `evalsLibreta` (evaluaciones + recuperatorios) alongside existing `evalRefs` to `CuadernoTabla`; tabla renders libreta columns with inline inputs saving to `/api/v1/notas/bulk`.

**Tech Stack:** Next.js 16 App Router (server component + 'use client' tabla), Supabase JS v2, TypeScript strict, Zod 4, Sonner.

**Spec:** `docs/superpowers/specs/2026-10-17-cuaderno-v3-gradebook.md`

## Global Constraints

- Use `getSession` (not `requireSession`) and `import { z } from 'zod'` (not zod/v4) — project convention.
- Never include `año_lectivo_id` in Supabase `.select()` string — causes `ñ` encoding corruption. Use `.select('*')` for cursos table.
- `supabase db push` is PROHIBITED — only use `mcp__supabase__apply_migration` for schema changes (none expected in this plan).
- Git: commit directly to master (no feature branches).
- TypeScript strict — no implicit `any`.
- Period closed = `periodo.cerrado_at IS NOT NULL` checked client-side after fetch (server already passes boolean prop).
- Inline note value convention: number string OR `'A'`/`'a'` for ausente → maps to `{ valor_numerico: null, valor_literal: 'A' }` at save time.
- Key pattern for valoresLibreta: `${evalId}::${alumnoId}::${dimId ?? '__'}` (same `procesoKey` helper already in cuaderno-tabla.tsx).
- `nota_aprobacion` lives on the `instituciones` table (not on `escalas`). Extend the instituciones query in `cuaderno/page.tsx` from `select('id')` to `select('id, nota_aprobacion')`.
- Recuperatorio cell lock: visual only (input `disabled`). The bulk endpoint does NOT validate. Lock = `parentNota >= nota_aprobacion` where parentNota comes from the parent eval's `notasMap` for that alumno+dimId.

## Review Focus

1. **Recuperatorio save with dimensions:** If the recuperatorio eval has dimensions, each dim must get its own nota row (`dimension_id: dim.id`). Incorrect dim_id mapping silently saves to wrong row.
2. **Ausente with dimensions:** Ausente must send `valor_literal: 'A'` for EACH dimension_id of that eval, not just `dimension_id: null`. Sending null dim_id on a dimensioned eval violates the upsert conflict key.
3. **Smart default loop:** If materia[0] has no periods (no año_lectivo_id configured), page must not crash — fall through to "sin períodos" empty state gracefully.
4. **Period closed detection:** `periodoCerrado` passed to tabla must reflect the CURRENTLY DISPLAYED period, not just whether any period of the materia is closed. Stale prop disables all cells forever.
5. **Guardar todo partial failure:** If libreta save succeeds but proceso save fails (or vice versa), user must get a clear error count. Silent partial success is misleading.
6. **Recuperatorio dim lock — dim mismatch:** The recuperatorio inherits dimensions from the parent eval (same dim IDs). But the lock lookup uses `dim.id` from the recuperatorio's own `dimensiones` array against the parent's `notasMap`. If the recuperatorio was manually given different dims (edge case), lock silently fails or locks wrong cells. Verify with a recuperatorio that has the same dims as parent.

---

### Task 1: Smart defaults + periodos with activo/cerrado_at

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`

**Interfaces:**
- Consumes: existing `materias[]`, existing periodos query
- Produces: `selectedMateria` defaults to `materias[0]` when no `materia_id` param; `selectedPeriodo` defaults to `periodos.find(p => p.activo) ?? periodos[0]` when no `periodo_id` param; `periodoCerrado: boolean` available in scope for T2.

- [ ] **Step 1:** Extend the periodos query to select `id, nombre, orden, activo, cerrado_at` (currently only selects `id, nombre, orden`). Update local `Periodo` type to include `activo: boolean | null` and `cerrado_at: string | null`.

- [ ] **Step 2:** After `const selectedMateria = ...` line, change from strict `materia_id ? ... : null` to:
```ts
const selectedMateria = materia_id
  ? materias.find(m => m.id === materia_id)
  : (materias[0] ?? null)
```

- [ ] **Step 3:** After periodos are fetched (inside the `selectedMateria?.cursoId` block), add period default:
```ts
const defaultPeriodo = periodos.find(p => p.activo) ?? periodos[0] ?? null
const selectedPeriodo = periodo_id
  ? periodos.find(p => p.id === periodo_id)
  : defaultPeriodo
```

- [ ] **Step 4:** Compute `periodoCerrado`:
```ts
const periodoCerrado = selectedPeriodo
  ? selectedPeriodo.cerrado_at != null
  : false
```

- [ ] **Step 5:** `tsc --noEmit` — no errors.

- [ ] **Step 6:** Manual verify: navigate to `/dashboard/[slug]/cuaderno` with no params — page loads with first materia + active period selected and table visible (if data exists).

- [ ] **Step 7:** Commit.
```bash
git commit -m "feat: cuaderno auto-selecciona materia y período activo por defecto"
```

---

### Task 2: Fetch evalsLibreta + recuperatorios + notas

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`

**Interfaces:**
- Consumes: `inst` (already in scope — add `nota_aprobacion` to its select), `selectedMateria`, `selectedPeriodo`, `alumnoIds`, `dimMap` (already computed in scope)
- Produces:
```ts
type EvalLibretaCol = {
  id: string
  nombre: string
  tipo: string
  dimensionIds: string[]
  dimensiones: Array<{ id: string; nombre: string; orden: number }>
  notasMap: Record<string, string>       // key: `alumnoId::dimId??'__'`
  recuperatorio: {
    id: string
    nombre: string
    dimensionIds: string[]
    dimensiones: Array<{ id: string; nombre: string; orden: number }>
    notasMap: Record<string, string>
  } | null
}
// Added to tableData:
evalsLibreta: EvalLibretaCol[]
periodoCerrado: boolean
notaAprobacion: number | null
```

- [ ] **Step 1:** Extend the instituciones query (top of page.tsx) from `select('id')` to `select('id, nota_aprobacion')`. TypeScript type for `inst` will need updating accordingly.

- [ ] **Step 2:** Derive `notaAprobacion` from inst (can be done outside `if (selectedMateria && selectedPeriodo)` block):
```ts
const notaAprobacion: number | null = (inst as { nota_aprobacion?: number | null }).nota_aprobacion ?? null
```

- [ ] **Step 3:** Inside the `if (selectedMateria && selectedPeriodo)` block, after the existing eval-refs fetch, add:
```ts
// Fetch all evaluaciones for this materia+período (including recuperatorios)
const { data: evalsRaw } = await supabase
  .from('evaluaciones')
  .select('id, nombre, tipo, permite_recuperatorio, recuperatorio_de_evaluacion_id, orden, evaluacion_dimensiones(dimension_id)')
  .eq('materia_id', materia_id!)
  .eq('periodo_id', periodo_id!)
  .is('deleted_at', null)
  .order('orden')
```

- [ ] **Step 4:** Filter and partition client-side:
```ts
type EvalRaw = NonNullable<typeof evalsRaw>[number]
const allEvalsFiltered = (evalsRaw ?? []).filter(
  (ev: EvalRaw) => !(ev as { es_definitiva_periodo?: boolean }).es_definitiva_periodo
)
const primaryEvals = allEvalsFiltered.filter((ev: EvalRaw) => !ev.recuperatorio_de_evaluacion_id)
const recuperatorioEvals = allEvalsFiltered.filter((ev: EvalRaw) => !!ev.recuperatorio_de_evaluacion_id)
const recuperatorioByParent = new Map(
  recuperatorioEvals.map((ev: EvalRaw) => [ev.recuperatorio_de_evaluacion_id!, ev])
)
```

- [ ] **Step 5:** Fetch notas for all eval IDs:
```ts
const libretaEvalIds = allEvalsFiltered.map((ev: EvalRaw) => ev.id)
let notasLibretaRaw: Array<{ evaluacion_id: string; alumno_id: string; dimension_id: string | null; valor_numerico: number | null; valor_literal: string | null }> = []
if (libretaEvalIds.length > 0) {
  const { data: nl } = await supabase
    .from('notas')
    .select('evaluacion_id, alumno_id, dimension_id, valor_numerico, valor_literal')
    .in('evaluacion_id', libretaEvalIds)
    .in('alumno_id', alumnoIds)
  notasLibretaRaw = nl ?? []
}
```

- [ ] **Step 6:** Build notasMap per eval (same pattern as notas_referencia):
```ts
const notasByEval = new Map<string, Record<string, string>>()
for (const n of notasLibretaRaw) {
  if (!notasByEval.has(n.evaluacion_id)) notasByEval.set(n.evaluacion_id, {})
  const key = `${n.alumno_id}::${n.dimension_id ?? '__'}`
  notasByEval.get(n.evaluacion_id)![key] =
    n.valor_numerico?.toString() ?? n.valor_literal ?? ''
}
```

- [ ] **Step 7:** Build `evalsLibreta: EvalLibretaCol[]`:
```ts
const evalsLibreta: EvalLibretaCol[] = primaryEvals.map((ev: EvalRaw) => {
  const dims = (ev.evaluacion_dimensiones as Array<{ dimension_id: string }>)
    .map(d => dimMap.get(d.dimension_id))
    .filter((d): d is { id: string; nombre: string; orden: number } => d != null)
    .sort((a, b) => a.orden - b.orden)

  const recup = recuperatorioByParent.get(ev.id) ?? null
  const recupDims = recup
    ? (recup.evaluacion_dimensiones as Array<{ dimension_id: string }>)
        .map(d => dimMap.get(d.dimension_id))
        .filter((d): d is { id: string; nombre: string; orden: number } => d != null)
        .sort((a, b) => a.orden - b.orden)
    : []

  return {
    id: ev.id,
    nombre: ev.nombre,
    tipo: ev.tipo,
    dimensionIds: (ev.evaluacion_dimensiones as Array<{ dimension_id: string }>).map(d => d.dimension_id),
    dimensiones: dims,
    notasMap: notasByEval.get(ev.id) ?? {},
    recuperatorio: recup ? {
      id: recup.id,
      nombre: recup.nombre,
      dimensionIds: (recup.evaluacion_dimensiones as Array<{ dimension_id: string }>).map(d => d.dimension_id),
      dimensiones: recupDims,
      notasMap: notasByEval.get(recup.id) ?? {},
    } : null,
  }
})
```

- [ ] **Step 8:** Add to `tableData`:
```ts
tableData = {
  // ...existing fields...
  evalsLibreta,
  periodoCerrado,
  notaAprobacion,
}
```
Update `tableData` type definition to include all three new fields.

- [ ] **Step 9:** Pass to `<CuadernoTabla>` (add as optional `evalsLibreta?: EvalLibretaCol[]`, `periodoCerrado?: boolean`, `notaAprobacion?: number | null` to tabla Props to avoid breaking build while T3 isn't done yet).

- [ ] **Step 10:** `tsc --noEmit` — no errors.

- [ ] **Step 11:** Commit.
```bash
git commit -m "feat: cuaderno fetcha evaluaciones libreta, recuperatorios y nota_aprobacion"
```

---

### Task 3: CuadernoTabla — columnas libreta inline editables

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx`

**Interfaces:**
- Consumes: `evalsLibreta: EvalLibretaCol[]`, `periodoCerrado: boolean`, `notaAprobacion: number | null` from T2; also needs `materiaId`, `periodoId`, `slug` for drill-down links
- Produces: libreta columns rendered + editable; recuperatorio cells locked when parent dim approved; link icon on each column header navigates to existing nota editor

`EvalLibretaCol` type definition belongs in `cuaderno-tabla.tsx` (imported by page via inline type or moved to a shared types file — keep local for now, same pattern as other interfaces in this file).

- [ ] **Step 1:** Add `EvalLibretaCol` interface and new props to `CuadernoTabla`:
```ts
interface EvalLibretaCol {
  id: string
  nombre: string
  tipo: string
  dimensionIds: string[]
  dimensiones: Array<{ id: string; nombre: string; orden: number }>
  notasMap: Record<string, string>
  recuperatorio: {
    id: string; nombre: string
    dimensionIds: string[]; dimensiones: Array<{ id: string; nombre: string; orden: number }>
    notasMap: Record<string, string>
  } | null
}
// In Props:
evalsLibreta?: EvalLibretaCol[]
periodoCerrado?: boolean
notaAprobacion?: number | null
slug: string   // already in Props? if not, add it for drill-down links
```

- [ ] **Step 2:** Initialize `valoresLibreta` state (lazy, same pattern as `valoresProceso`):
```ts
const [valoresLibreta, setValoresLibreta] = useState<Record<string, string>>(() => {
  const init: Record<string, string> = {}
  for (const ev of evalsLibreta ?? []) {
    for (const [k, v] of Object.entries(ev.notasMap)) init[`${ev.id}::${k}`] = v
    if (ev.recuperatorio) {
      for (const [k, v] of Object.entries(ev.recuperatorio.notasMap))
        init[`${ev.recuperatorio.id}::${k}`] = v
    }
  }
  return init
})
```
Key pattern: `procesoKey(evalId, alumnoId, dimId)` — reuse existing helper.

- [ ] **Step 3:** Add `showLibreta` state (chip toggle), default `true`:
```ts
const [showLibreta, setShowLibreta] = useState(true)
```

- [ ] **Step 4:** Add group header row in `<thead>`. Above the existing column headers row, add a `<tr>` with colspan group labels:
```tsx
<tr>
  <th /> {/* alumno col */}
  {showLibreta && (evalsLibreta ?? []).length > 0 && (
    <th colSpan={libretaColCount} className="text-xs font-semibold text-sky-700 bg-sky-50/50 px-2 py-1 text-left border-b">
      Libreta {periodoCerrado && <span className="ml-1 text-[10px] font-normal text-amber-600">(período cerrado)</span>}
    </th>
  )}
  {showProceso && evalRefsFiltradas.length > 0 && (
    <th colSpan={procesoColCount} className="text-xs font-semibold text-muted-foreground px-2 py-1 text-left border-b border-l">
      Referencia
    </th>
  )}
  {/* prom + definitiva: no label */}
  ...
</tr>
```
`libretaColCount` = sum of (dims.length || 1) + (recup ? recupDims.length || 1 : 0) for each eval.

- [ ] **Step 5:** Render libreta column headers (before existing eval-ref headers). Each header includes a drill-down link icon:
```tsx
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

{showLibreta && (evalsLibreta ?? []).map(ev => {
  const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null]
  const drillUrl = `/dashboard/${slug}/notas/${ev.id}?from=cuaderno&materia_id=${materiaId}&periodo_id=${periodoId}`
  return [
    ...cols.map((dim, idx) => (
      <th key={`lib::${ev.id}::${dim?.id ?? '__'}`}
          className="group text-center px-2 py-2 font-medium text-xs text-sky-700 bg-sky-50/30 min-w-20">
        {idx === 0 ? (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-0.5">
              <span className="truncate max-w-20">{ev.nombre}</span>
              <Link href={drillUrl} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="size-3" />
              </Link>
            </div>
            {dim && <span className="text-[10px] font-normal opacity-70">{dim.nombre}</span>}
          </div>
        ) : (
          <>
            <div className="truncate max-w-20">{ev.nombre}</div>
            {dim && <div className="text-[10px] font-normal opacity-70">{dim.nombre}</div>}
          </>
        )}
      </th>
    )),
    ...(ev.recuperatorio ? (() => {
      const rDrillUrl = `/dashboard/${slug}/notas/${ev.recuperatorio!.id}?from=cuaderno&materia_id=${materiaId}&periodo_id=${periodoId}`
      const rCols = ev.recuperatorio.dimensiones.length > 0 ? ev.recuperatorio.dimensiones : [null]
      return rCols.map((dim, idx) => (
        <th key={`lib::${ev.recuperatorio!.id}::${dim?.id ?? '__'}`}
            className="group text-center px-1 py-2 font-medium text-xs text-sky-600/70 bg-sky-50/20 min-w-16"
            title={ev.recuperatorio!.nombre}>
          {idx === 0 && (
            <div className="flex items-center justify-center gap-0.5">
              <span>R</span>
              <Link href={rDrillUrl} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="size-3" />
              </Link>
            </div>
          )}
          {dim && <div className="text-[10px] font-normal opacity-70">{dim.nombre}</div>}
        </th>
      ))
    })() : []),
  ]
})}
```

- [ ] **Step 6:** Render libreta cells per alumno row. Recuperatorio cells locked if parent dim nota >= notaAprobacion:
```tsx
{showLibreta && (evalsLibreta ?? []).map(ev => {
  const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null]
  const evalCells = cols.map(dim => {
    const k = procesoKey(ev.id, alumno.id, dim?.id ?? null)
    return (
      <td key={`lib::${k}`} className="px-1 py-1 bg-sky-50/20">
        <Input
          value={valoresLibreta[k] ?? ''}
          onChange={e => setValoresLibreta(prev => ({ ...prev, [k]: e.target.value }))}
          disabled={!!periodoCerrado}
          className="h-7 w-16 text-center text-xs p-1"
          placeholder="—"
        />
      </td>
    )
  })
  const recupCells = ev.recuperatorio ? (() => {
    const rCols = ev.recuperatorio.dimensiones.length > 0 ? ev.recuperatorio.dimensiones : [null]
    return rCols.map(dim => {
      const k = procesoKey(ev.recuperatorio!.id, alumno.id, dim?.id ?? null)
      // Lock if parent dim was approved
      const parentNota = parseFloat(ev.notasMap[procesoKey(ev.id, alumno.id, dim?.id ?? null)] ?? '')
      const dimApproved = notaAprobacion != null && !isNaN(parentNota) && parentNota >= notaAprobacion
      return (
        <td key={`lib::recup::${k}`} className="px-1 py-1 bg-sky-50/10">
          {dimApproved ? (
            <span className="flex h-7 w-14 items-center justify-center text-xs text-muted-foreground">
              ✓ {parentNota}
            </span>
          ) : (
            <Input
              value={valoresLibreta[k] ?? ''}
              onChange={e => setValoresLibreta(prev => ({ ...prev, [k]: e.target.value }))}
              disabled={!!periodoCerrado}
              className="h-7 w-14 text-center text-xs p-1"
              placeholder="—"
            />
          )}
        </td>
      )
    })
  })() : []
  return [...evalCells, ...recupCells]
})}
```

- [ ] **Step 7:** `tsc --noEmit` — no errors.

- [ ] **Step 8:** Manual verify: columns appear; hover over column header shows drill-down link; click link opens `/notas/[id]`; recuperatorio cell for approved dim shows "✓ 8" (not input).

- [ ] **Step 9:** Commit.
```bash
git commit -m "feat: cuaderno libreta inline editable con lock recuperatorio y drill-down"
```

---

### Task 4: handleSaveLibreta + botón "Guardar todo"

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx`

**Interfaces:**
- Consumes: `valoresLibreta`, `evalsLibreta`, `alumnos` — all already in scope
- Produces: `handleSaveLibreta` saves all libreta evals via `/api/v1/notas/bulk`; single "Guardar todo" button replaces existing "Guardar seguimiento"

- [ ] **Step 1:** Add `handleSaveLibreta` function:
```ts
async function handleSaveLibreta(): Promise<{ errors: number }> {
  const evs = evalsLibreta ?? []
  if (evs.length === 0) return { errors: 0 }

  // Build list of all evals to save (primaries + recuperatorios)
  const allToSave = evs.flatMap(ev => [
    ev,
    ...(ev.recuperatorio ? [ev.recuperatorio] : []),
  ])

  let errors = 0
  await Promise.allSettled(
    allToSave.map(async ev => {
      const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null]
      const notas = alumnos.flatMap(a =>
        cols.map(dim => {
          const k = procesoKey(ev.id, a.id, dim?.id ?? null)
          const raw = (valoresLibreta[k] ?? '').trim()
          if (raw === '') return null
          const isAusente = raw.toLowerCase() === 'a'
          return {
            alumno_id: a.id,
            dimension_id: dim?.id ?? null,
            valor_numerico: isAusente ? null : (parseFloat(raw) || null),
            valor_literal: isAusente ? 'A' : null,
          }
        }).filter(Boolean)
      )
      if (notas.length === 0) return

      const res = await fetch('/api/v1/notas/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluacion_id: ev.id, notas }),
      })
      if (!res.ok) errors++
    })
  )
  return { errors }
}
```

- [ ] **Step 2:** Add `handleSaveAll` function that runs both saves concurrently:
```ts
async function handleSaveAll() {
  setSaving(true)
  const [libreraResult, procesoResult] = await Promise.all([
    handleSaveLibreta(),
    handleSaveProceso(),  // existing function — refactor to return { errors: number }
  ])
  setSaving(false)

  const total = libreraResult.errors + procesoResult.errors
  if (total > 0) {
    toast.error(`${total} error(es) al guardar`)
  } else {
    toast.success('Notas guardadas')
  }
  router.refresh()
}
```
Refactor existing `handleSaveProceso` to return `{ errors: number }` instead of calling toast/refresh directly.

- [ ] **Step 3:** Replace "Guardar seguimiento" button with "Guardar todo":
```tsx
<Button onClick={handleSaveAll} disabled={saving}>
  {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
  Guardar todo
</Button>
```

- [ ] **Step 4:** `tsc --noEmit` — no errors.

- [ ] **Step 5:** Manual verify: enter notas in both libreta and referencia columns → "Guardar todo" → reload → notas persisten en ambos grupos.

- [ ] **Step 6:** Manual verify ausente: type `A` in a libreta cell → save → reload → cell shows `A`.

- [ ] **Step 7:** Commit.
```bash
git commit -m "feat: guardar todo notas libreta y referencia desde cuaderno"
```

---

### Task 5: Chip toggles + grupo visual "Libreta"

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx`

**Interfaces:**
- Consumes: `showLibreta` state from T3; existing `showProceso`, `showDefinitiva`
- Produces: chip "Libreta" added to existing chip row; libreta columns hidden/shown per chip state

- [ ] **Step 1:** Add "Libreta" chip in the existing chip row (before "Proceso"):
```tsx
{(evalsLibreta ?? []).length > 0 && (
  <button
    onClick={() => setShowLibreta(v => !v)}
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
      showLibreta
        ? 'bg-sky-600 text-white border-sky-600'
        : 'border-border text-muted-foreground hover:text-foreground'
    }`}
  >
    Libreta {(evalsLibreta ?? []).length > 0 && `(${(evalsLibreta ?? []).length})`}
  </button>
)}
```

- [ ] **Step 2:** Rename existing "Proceso" chip to "Referencia" (label change only, variable stays `showProceso`).

- [ ] **Step 3:** Verify the group header `<tr>` from T3 Step 4 is correctly conditioned on `showLibreta` and `showProceso` — confirm colspan calculations are correct for both groups.

- [ ] **Step 4:** `tsc --noEmit` — no errors.

- [ ] **Step 5:** Manual verify chip behavior: toggle "Libreta" → libreta columns disappear, referencia stays; toggle "Referencia" → referencia disappears, libreta stays.

- [ ] **Step 6:** Commit.
```bash
git commit -m "feat: chips Libreta/Referencia/Definitiva en cuaderno gradebook"
```

---

### Task 6: Breadcrumb "← Cuaderno" en página de notas

**Files:**
- Modify: `src/app/dashboard/[slug]/notas/[evaluacion_id]/page.tsx`

**Interfaces:**
- Consumes: `searchParams.from`, `searchParams.materia_id`, `searchParams.periodo_id` from URL
- Produces: conditional breadcrumb link rendered above the page title when `from === 'cuaderno'`

- [ ] **Step 1:** In `page.tsx`, resolve `searchParams` (it's a Promise in Next.js 16 — `await params`). Extract `from`, `materia_id`, `periodo_id` from searchParams.

- [ ] **Step 2:** Build breadcrumb URL:
```ts
const fromCuaderno = searchParams.from === 'cuaderno'
const backUrl = fromCuaderno
  ? `/dashboard/${slug}/cuaderno?materia_id=${searchParams.materia_id ?? ''}&periodo_id=${searchParams.periodo_id ?? ''}`
  : null
```

- [ ] **Step 3:** Render breadcrumb above the page heading (only when `backUrl` is set):
```tsx
{backUrl && (
  <Link href={backUrl} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
    <ChevronLeft className="size-4" />
    Cuaderno
  </Link>
)}
```
Import `ChevronLeft` from `lucide-react` and `Link` from `next/link`.

- [ ] **Step 4:** `tsc --noEmit` — no errors.

- [ ] **Step 5:** Manual verify: open cuaderno → click drill-down link on a libreta column → notas page shows "← Cuaderno" breadcrumb → click it → returns to cuaderno with correct materia+período selected.

- [ ] **Step 6:** Manual verify: navigate to `/notas/[id]` directly (no `?from=cuaderno`) → no breadcrumb shown.

- [ ] **Step 7:** Commit.
```bash
git commit -m "feat: breadcrumb cuaderno en pagina de notas"
```

---

## Post-implementation

After all 6 tasks: run whole-branch review (MERGE_BASE = commit before T1).

Verify the 6 Review Focus items explicitly:
1. Recuperatorio with dims → check notas bulk body has correct dimension_id per row
2. Ausente with dims → check 'A' sends for each dimension_id
3. Materia[0] with no periods → confirm graceful empty state (no crash)
4. Period closed → open a closed period in cuaderno, confirm libreta inputs are disabled, referencia inputs are not
5. Guardar todo partial failure → mock a failing bulk call, confirm error count toast shows both contributions
6. Recuperatorio dim mismatch → recuperatorio has different dims than parent → lock logic uses recuperatorio's dims to look up parent (test: parentNota lookup uses the *recuperatorio* dim.id to find parent notasMap)
