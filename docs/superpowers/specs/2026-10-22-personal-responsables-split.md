# Personal + Responsables Split — Design Spec

**Date:** 2026-10-22  
**Status:** Approved

---

## Intent

The current "Usuarios" page mixes two conceptually distinct audiences: **staff** (admins, docentes) who run the institution, and **responsables** (padres, tutores) who are families of students. They have different workflows and different information needs. Splitting them gives each a focused page and makes the admin's navigation intent-first.

## Goals

- Replace `/usuarios` sidebar item with two items: **Personal** and **Responsables**
- `/personal` shows only admin + docente memberships; only these roles can be created here
- `/responsables` shows only responsable memberships; prominently shows linked alumnos
- Old URL `/usuarios` redirects to `/personal` (backwards compat for bookmarks)
- No changes to underlying data model, API routes, or permissions

## Non-Goals

- No new API routes
- No changes to how responsables are linked to alumnos (that stays in the alumno config sheet)
- No changes to the `alumno` role (hidden from both pages — managed via alumno config sheet)
- No pagination (existing tables handle search/filter inline)

## URL Structure

| URL | Sidebar label | Roles shown | Can create |
|-----|--------------|-------------|------------|
| `/dashboard/[slug]/personal` | Personal | admin, docente | admin, docente |
| `/dashboard/[slug]/responsables` | Responsables | responsable | responsable |
| `/dashboard/[slug]/usuarios` | (removed) | — | redirect → /personal |

## Sidebar

Under the existing **Configuración** group, replace the single "Usuarios" item with two items (in order):

```
Personal      icon: UserCog      → /dashboard/[slug]/personal
Responsables  icon: UsersRound   → /dashboard/[slug]/responsables
```

Active detection: `pathname.startsWith(/personal)` and `pathname.startsWith(/responsables)` respectively.

## Personal Page (`/personal`)

**Heading:** "Personal"  
**Subheading:** "N miembros activos" (count of active admin+docente memberships)  
**Button:** "Nuevo" → NuevoUsuarioSheet with roles restricted to `[admin, docente]`

**Table columns:** Apellido/Nombre · Email · Rol · Asignaciones (materias for docente, — for admin) · Estado · Actions  
**Rol filter dropdown:** Admin, Docente (no Responsable)  
**No alumnos data fetched**

Editing: EditarUsuarioSheet with roles restricted to `[admin, docente]`.

## Responsables Page (`/responsables`)

**Heading:** "Responsables"  
**Subheading:** "N responsables activos"  
**Button:** "Nuevo responsable" → NuevoUsuarioSheet with roles restricted to `[responsable]`, rol selector hidden (auto-set)

**Table columns:** Apellido/Nombre · Email · Alumnos vinculados · Estado · Actions  
**No rol filter** (all shown are responsable)  
**No materias data fetched**

Editing: EditarUsuarioSheet with roles restricted to `[responsable]`, rol selector hidden.

## Component Reuse

Existing components are extended with a `roles` prop rather than forked:

- `UsuariosTabla`: add `availableRoles?: string[]` — controls which roles appear in the rol filter dropdown
- `NuevoUsuarioSheet`: add `roles?: Array<{value: string; label: string}>` — controls role selector options; if array has exactly one entry, hide the selector and use that role
- `EditarUsuarioSheet`: same `roles` prop as NuevoUsuarioSheet

## Constraints

- Next.js 16 App Router — pages are React Server Components; client state only in `'use client'` files
- No `año_lectivo_id` in `.select()` for cursos — use `select('*')` if cursos are ever queried
- `createAdminClient()` for cross-user queries; `createClient()` for session-scoped queries
- TypeScript strict — no `any`, imports from `@/`
- Tailwind v4, base-ui components — no Radix direct imports
