# Pre-Launch Hardening — Libreta Digital

**Fecha:** 2026-10-22  
**Alcance:** Todo lo necesario antes del primer cliente de pago

---

## Intent y Why

Antes de poner en producción con clientes reales hay tres categorías de deuda:

1. **Seguridad**: endpoints que no validan institución correctamente, debug expuesto, Google SSO confunde usuarios.
2. **Confiabilidad**: comunicados pueden mandarse doble, invite no reenvía email, session expirada falla silenciosamente.
3. **UX de lanzamiento**: admin nuevo llega a dashboard vacío sin guía, páginas clave sin empty states, logout accidental.

---

## Goals

- Zero errores silenciosos en flujos críticos (comunicados, invite, session).
- Admin nuevo puede autogestionar su institución sin ayuda manual.
- Sin flujos que confundan a un usuario real en producción.

## Non-Goals

- Rate limiting avanzado con Redis/Upstash (Supabase ya limita auth endpoints; auth admin-only en el resto).
- Internacionalización.
- Refactors de performance (N+1 queries tolerables en escala MVP).

## Anti-Goals

- No agregar features nuevas bajo bandera de "hardening".
- No cambiar el modelo de datos salvo para lo estrictamente requerido.

---

## Constraints

- Stack: Next.js 16 App Router, Supabase, TypeScript strict, Tailwind v4, base-ui.
- Sin nuevas dependencias externas (ni Upstash, ni Redis) salvo que sea absolutamente necesario.
- `supabase db push` prohibido — solo `mcp__supabase__apply_migration`.
- Nunca `año_lectivo_id` en `.select()` string para cursos — usar `select('*')`.
- API routes: `getSession` (no `requireSession`).
- Git directo a master.

---

## Decisiones de diseño

### C1 — Rate limiting
Supabase ya rate-limita `resetPasswordForEmail` y toda la auth API. Los endpoints de negocio (`/usuarios`, `/invite`) requieren sesión de admin activa — la protección es la cuenta del admin. Decisión: no agregar dependencia de Redis/Upstash para MVP. En cambio, añadir un simple header `X-Request-ID` y log en `actividad_log` para detectar abuso post-facto.

### C3 — Google SSO + forgot-password
El problema real: un admin crea usuario con Google (`usa_google: true` implícito por email @gmail). El usuario va a forgot-password → recibe un link de reset de contraseña → no sirve porque su cuenta es OAuth. Fix: en `/forgot-password`, después del submit exitoso, mostrar mensaje adicional "Si tu cuenta usa Google, no necesitás contraseña — ingresá con el botón de Google". No hay detección server-side (expone existencia de cuenta).

### I1 — Institution deleted_at en usuarios POST
La ruta `POST /instituciones/[id]/usuarios` no verifica que la institución no esté borrada. El `id` viene del path — agregar query a `instituciones` con `is('deleted_at', null)` al inicio.

### I3 — Email batching en comunicados
`Promise.all` actual envía todos los emails simultáneamente. Resend tiene límite de burst. Fix: usar `Resend.emails.sendBatch()` en chunks de 100 (límite de la API de Resend). Mantener fire-and-forget con `.catch(console.error)`.

### I4 — Empty states
Agregar componente `EmptyState` reutilizable con icon + título + descripción + optional CTA button. Usarlo en: Alumnos, Personal, Responsables, Materias, Cursos, Comunicados.

### I5 — Invite resend envía email
`POST /invite` genera el link pero no manda email. Fix: llamar `sendBienvenida` con el nuevo `setup_url` al final, igual que en la creación.

### I6 — Session expirada
En el layout raíz del dashboard, agregar un client component `SessionGuard` que en `useEffect` verifica la sesión y, ante 401 de cualquier fetch, redirige a `/login?session=expired`. Usar `window.addEventListener('unhandledrejection')` no — mejor wrapping en el cliente de Supabase.

### I7 — Branding endpoint público
El endpoint `/api/v1/instituciones/branding` devuelve nombre + logo. Esta data es pública (logos son assets de marketing). Decisión: hacer el endpoint público (remover verificación de sesión). No hay PII expuesto.

### I8 — Comunicados double-send
Agregar columna `enviado_at timestamptz` a `comunicados`. El POST la setea en el momento del envío. Si ya está seteada (re-envío accidental), retornar 409 Conflict. La UI debe deshabilitar el botón después del primer envío exitoso.

### C2 — Onboarding admin
Widget checklist en `home-admin.tsx` que detecta si la institución tiene: año lectivo activo, cursos, alumnos, personal (docentes). Muestra steps completados / pendientes. Se oculta cuando todos los steps están completos. No requiere nueva tabla — toda la info se infiere de queries existentes en `home-admin`.

### m1 — Notificaciones paginación
Agregar `?limit=50&offset=N` al endpoint y al bell component para cargar más.

### m4 — Logout confirmation
Usar `ConfirmDialog` existente en el click de logout del sidebar.

### m5 — Debug email en Vercel env
Cambiar check de `NODE_ENV === 'production'` a `process.env.VERCEL_ENV === 'production'` para que funcione en preview deployments.

---

## Entidades afectadas

| Tabla | Cambio |
|-------|--------|
| `comunicados` | +columna `enviado_at timestamptz` |

Todas las demás son cambios de código solamente.
