# Personal + Responsables Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the "Usuarios" page into "Personal" (admin+docente) and "Responsables" (responsable) with dedicated sidebar items and URLs.

**Architecture:** Extend three existing shared components with a `roles` prop to control which roles are visible/selectable, then create two new pages (`/personal`, `/responsables`) that pass the appropriate role subsets. The old `/usuarios` page becomes a server-side redirect. The sidebar is updated to replace the single "Usuarios" item with two items.

**Tech Stack:** Next.js 16 App Router, Supabase, TypeScript strict, Tailwind v4, base-ui, vitest

**Spec:** `docs/superpowers/specs/2026-10-22-personal-responsables-split.md`

## Global Constraints

- No new API routes — all data fetching reuses existing patterns from `usuarios/page.tsx`
- `createAdminClient()` for cross-user queries (memberships, alumno_responsables, materia_docentes)
- TypeScript strict — no `as any`
- `select('*')` for cursos if ever queried (never include `año_lectivo_id` explicitly)
- `getSession` (not `requireSession`) for API routes; pages use `requireSession`
- Tailwind v4, base-ui — no Radix direct imports
- Git directo a master

## Review Focus

1. **Admin navigating to old `/usuarios` URL**: should redirect to `/personal` — tested in Task 3.
2. **Responsables page shows no rol filter** (single role, filter would show nothing): `availableRoles` with one entry hides the dropdown — tested in Task 2.
3. **NuevoUsuarioSheet with single role** hides the rol selector and auto-sets the role — tested in Task 1.
4. **Sidebar active state**: `/responsables` path marks Responsables item active, not Personal — tested in Task 3.
5. **EditarUsuarioSheet in Personal context** does not show Responsable in the rol dropdown — tested in Task 2.

---

## File Structure

**Modify:**
- `src/app/dashboard/[slug]/usuarios/usuarios-tabla.tsx` — add `availableRoles` prop
- `src/app/dashboard/[slug]/usuarios/nuevo-usuario-sheet.tsx` — add `roles` prop, hide selector when single role
- `src/app/dashboard/[slug]/usuarios/editar-usuario-sheet.tsx` — add `roles` prop, hide selector when single role
- `src/app/dashboard/[slug]/usuarios/page.tsx` — replace with redirect to `/personal`
- `src/components/app-sidebar.tsx` — replace Usuarios → Personal + Responsables

**Create:**
- `src/app/dashboard/[slug]/personal/page.tsx`
- `src/app/dashboard/[slug]/personal/loading.tsx`
- `src/app/dashboard/[slug]/responsables/page.tsx`
- `src/app/dashboard/[slug]/responsables/loading.tsx`

---

### Task 1: Extend shared components with `roles` prop

**Files:**
- Modify: `src/app/dashboard/[slug]/usuarios/usuarios-tabla.tsx`
- Modify: `src/app/dashboard/[slug]/usuarios/nuevo-usuario-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/usuarios/editar-usuario-sheet.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `UsuariosTabla` accepts `availableRoles?: string[]` — filters `ROLES_FILTRO` to intersection; defaults to `['admin', 'docente', 'responsable']` when omitted
  - `NuevoUsuarioSheet` accepts `roles?: Array<{value: string; label: string}>` — defaults to current `ROLES` const; when array has exactly 1 entry, skip rendering the rol `<Select>` and initialize `rol` state to that entry's value
  - `EditarUsuarioSheet` accepts `roles?: Array<{value: string; label: string}>` — same behavior

- [ ] **Step 1: Write failing type-check test for UsuariosTabla**

  In `src/tests/lib/auth.test.ts` — no new test needed; verification is TypeScript compilation.
  Instead write the implementation first with the new prop signature and verify type-check passes.

  Run: `npx tsc --noEmit`
  Expected: current baseline passes (0 errors)

- [ ] **Step 2: Add `availableRoles` prop to `UsuariosTabla`**

  In `usuarios-tabla.tsx`:
  - Add to `Props`: `availableRoles?: string[]`
  - Replace the hardcoded `ROLES_FILTRO` usage in the rol filter `<Select>` with:
    ```ts
    const rolesDisponibles = availableRoles
      ? ROLES_FILTRO.filter(r => availableRoles.includes(r))
      : ROLES_FILTRO
    ```
  - If `rolesDisponibles.length <= 1`, do not render the rol filter `<Select>` group at all
  - Use `rolesDisponibles` as the items in the Select

- [ ] **Step 3: Add `roles` prop to `NuevoUsuarioSheet`**

  In `nuevo-usuario-sheet.tsx`:
  - Add to `Props`: `roles?: Array<{value: string; label: string}>`
  - Replace `const ROLES = [...]` usage in the JSX with `const rolesDisponibles = roles ?? ROLES`
  - If `rolesDisponibles.length === 1`: initialize `rol` state to `rolesDisponibles[0].value` in the `useState('')` call (change to `useState(roles?.length === 1 ? roles[0].value : '')`) and skip rendering the rol `<Select>` entirely
  - The `<Label>` + `<Select>` for rol wrapped in `{rolesDisponibles.length > 1 && (...)}` conditional

- [ ] **Step 4: Add `roles` prop to `EditarUsuarioSheet`**

  Same pattern as Step 3 but in `editar-usuario-sheet.tsx`:
  - Add `roles?: Array<{value: string; label: string}>` to `Props`
  - `const rolesDisponibles = roles ?? ROLES`
  - Wrap the rol `<Select>` in `{rolesDisponibles.length > 1 && (...)}`
  - When hidden, `propRol` is the immutable role (field is display-only if needed, or just hidden)

- [ ] **Step 5: Verify TypeScript passes**

  Run: `npx tsc --noEmit`
  Expected: 0 errors

- [ ] **Step 6: Verify vitest passes**

  Run: `npx vitest run`
  Expected: all existing tests pass, no regressions

- [ ] **Step 7: Commit**

  ```bash
  git add src/app/dashboard/\[slug\]/usuarios/usuarios-tabla.tsx \
          src/app/dashboard/\[slug\]/usuarios/nuevo-usuario-sheet.tsx \
          src/app/dashboard/\[slug\]/usuarios/editar-usuario-sheet.tsx
  git commit -m "feat: add roles/availableRoles prop to usuarios shared components"
  ```

---

### Task 2: Personal page + loading

**Files:**
- Create: `src/app/dashboard/[slug]/personal/page.tsx`
- Create: `src/app/dashboard/[slug]/personal/loading.tsx`

**Interfaces:**
- Consumes: `UsuariosTabla` with `availableRoles={['admin', 'docente']}` from Task 1
- Consumes: `NuevoUsuarioSheet` with `roles={PERSONAL_ROLES}` from Task 1
- Produces: `/personal` page accessible to admin role

```ts
const PERSONAL_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'docente', label: 'Docente' },
]
```

- [ ] **Step 1: Create `personal/page.tsx`**

  Copy `usuarios/page.tsx` as starting point. Changes:
  - Filter memberships to `['admin', 'docente']`: add `.in('rol', ['admin', 'docente'])` to the memberships query (or filter in JS after)
  - Remove `responsableIds` and `alumnosByResponsable` blocks entirely (not needed)
  - Keep `docenteIds` + `materiasByDocente` block unchanged
  - Heading: `"Personal"` (not `"Usuarios"`)
  - Subheading: count of active admin+docente memberships
  - Pass `roles={PERSONAL_ROLES}` to `NuevoUsuarioSheet`
  - Pass `availableRoles={['admin', 'docente']}` to `UsuariosTabla`
  - Pass `roles={PERSONAL_ROLES}` to `EditarUsuarioSheet` (already passed inside `UsuariosTabla` — check if UsuariosTabla needs to thread this prop or if EditarUsuarioSheet is instantiated in the table)

  > **Note on EditarUsuarioSheet threading:** `EditarUsuarioSheet` is instantiated inside `usuarios-tabla.tsx`. Either (a) add a `rolesEdicion?: Array<{value: string; label: string}>` prop to `UsuariosTabla` and thread it through, or (b) accept that editing in Personal will still show Responsable in the rol dropdown (minor UX issue, not a security issue). **Ruling: thread `rolesEdicion` through UsuariosTabla** — it's one extra prop, and the spec says editing in Personal should not show Responsable.

  Add `rolesEdicion?: Array<{value: string; label: string}>` to `UsuariosTabla.Props` in Task 1 (amend or add here). Pass it through to each `EditarUsuarioSheet` instance inside the table.

- [ ] **Step 2: Create `personal/loading.tsx`**

  Exact copy of `usuarios/loading.tsx` — identical skeleton layout.

- [ ] **Step 3: Verify TypeScript passes**

  Run: `npx tsc --noEmit`
  Expected: 0 errors

- [ ] **Step 4: Verify vitest passes**

  Run: `npx vitest run`
  Expected: all existing tests pass

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/dashboard/\[slug\]/personal/
  git commit -m "feat: add /personal page for admin+docente users"
  ```

---

### Task 3: Responsables page + loading + sidebar + /usuarios redirect

**Files:**
- Create: `src/app/dashboard/[slug]/responsables/page.tsx`
- Create: `src/app/dashboard/[slug]/responsables/loading.tsx`
- Modify: `src/app/dashboard/[slug]/usuarios/page.tsx`
- Modify: `src/components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `UsuariosTabla` with `availableRoles={['responsable']}` from Task 1
- Consumes: `NuevoUsuarioSheet` with `roles={RESPONSABLE_ROLES}` from Task 1
- Produces: `/responsables` page, updated sidebar, `/usuarios` redirect

```ts
const RESPONSABLE_ROLES = [{ value: 'responsable', label: 'Responsable' }]
```

- [ ] **Step 1: Create `responsables/page.tsx`**

  Copy `usuarios/page.tsx` as starting point. Changes:
  - Filter memberships: `.in('rol', ['responsable'])`
  - Remove `docenteIds` + `materiasByDocente` blocks entirely
  - Keep `responsableIds` + `alumnosByResponsable` block unchanged
  - Heading: `"Responsables"`
  - Subheading: count of active responsable memberships
  - Pass `roles={RESPONSABLE_ROLES}` to `NuevoUsuarioSheet`
  - Pass `availableRoles={['responsable']}` to `UsuariosTabla` (hides rol filter entirely — single-role)
  - Pass `rolesEdicion={RESPONSABLE_ROLES}` to `UsuariosTabla`
  - Button label: `"Nuevo responsable"`

- [ ] **Step 2: Create `responsables/loading.tsx`**

  Copy of `usuarios/loading.tsx`.

- [ ] **Step 3: Replace `usuarios/page.tsx` with redirect**

  Replace entire file content with:
  ```tsx
  import { redirect } from 'next/navigation'
  type Params = { params: Promise<{ slug: string }> }
  export default async function UsuariosRedirect({ params }: Params) {
    const { slug } = await params
    redirect(`/dashboard/${slug}/personal`)
  }
  ```

- [ ] **Step 4: Update `app-sidebar.tsx`**

  In the Configuración group, find the `SidebarMenuItem` for "Usuarios" (`href: /usuarios`, icon: `Users`). Replace with two items:

  ```tsx
  // Personal — admin+docente
  <SidebarMenuItem>
    <SidebarMenuButton
      render={<Link href={`/dashboard/${activeSlug}/personal`} />}
      isActive={pathname.startsWith(`/dashboard/${activeSlug}/personal`)}
    >
      <UserCog />
      Personal
    </SidebarMenuButton>
  </SidebarMenuItem>
  // Responsables
  <SidebarMenuItem>
    <SidebarMenuButton
      render={<Link href={`/dashboard/${activeSlug}/responsables`} />}
      isActive={pathname.startsWith(`/dashboard/${activeSlug}/responsables`)}
    >
      <UsersRound />
      Responsables
    </SidebarMenuButton>
  </SidebarMenuItem>
  ```

  Add `UserCog` and `UsersRound` to the lucide-react import line. Remove `Users` if no longer used elsewhere in the file (check — `Users` is currently the icon; if nothing else uses it, remove).

- [ ] **Step 5: Verify TypeScript passes**

  Run: `npx tsc --noEmit`
  Expected: 0 errors

- [ ] **Step 6: Verify vitest passes**

  Run: `npx vitest run`
  Expected: all existing tests pass

- [ ] **Step 7: Review Focus verification**

  Confirm manually (or by reading the code):
  - `/usuarios` page.tsx calls `redirect(…/personal)` — ✓
  - `UsuariosTabla` with `availableRoles={['responsable']}` renders `rolesDisponibles.length <= 1` → no rol filter — ✓
  - `NuevoUsuarioSheet` with single-entry `roles` prop hides rol Select — ✓
  - Sidebar `isActive` for Personal uses `.startsWith('/personal')`, for Responsables uses `.startsWith('/responsables')` — ✓
  - `EditarUsuarioSheet` in Personal context receives `rolesEdicion={PERSONAL_ROLES}` and does not render Responsable option — ✓

- [ ] **Step 8: Commit**

  ```bash
  git add src/app/dashboard/\[slug\]/responsables/ \
          src/app/dashboard/\[slug\]/usuarios/page.tsx \
          src/components/app-sidebar.tsx
  git commit -m "feat: split Usuarios into Personal and Responsables in sidebar"
  git push
  ```

---

## Self-Review Notes

**Spec coverage:** All spec requirements covered — new URLs, sidebar split, redirect, role filtering, component reuse.

**Step scan:** Each step is one action. Task 2 Step 1 has a ruling embedded (EditarUsuarioSheet threading) — executor must also amend `UsuariosTabla` with `rolesEdicion` prop either in Task 1 or Task 2 Step 1.

**Type consistency:** `availableRoles: string[]`, `roles: Array<{value: string; label: string}>`, `rolesEdicion: Array<{value: string; label: string}>` — consistent across tasks.

**Proportion:** Plan is directive, not transcript. Page implementations are described as "copy + specific changes", not full code dumps.

**Ruling recorded:** `rolesEdicion` prop added to `UsuariosTabla` to thread `EditarUsuarioSheet` role restriction — small addition, no spec conflict.
