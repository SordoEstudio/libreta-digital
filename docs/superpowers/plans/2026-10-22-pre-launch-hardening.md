# Pre-Launch Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar todos los gaps de seguridad, confiabilidad y UX identificados en la auditoría pre-lanzamiento.

**Architecture:** Fixes aislados por área — sin refactors transversales. Cada task es independiente. Orden recomendado por impacto, pero no hay dependencias entre tasks salvo Task 3 (migration) → Task 4 (usa la nueva columna).

**Tech Stack:** Next.js 16 App Router, Supabase, TypeScript strict, Tailwind v4, base-ui, Resend v6, Zod v4

**Spec:** `docs/superpowers/specs/2026-10-22-pre-launch-hardening.md`

## Global Constraints

- `supabase db push` PROHIBIDO — solo `mcp__supabase__apply_migration` para DDL
- API routes usan `getSession` (no `requireSession`)
- Cursos: nunca incluir `año_lectivo_id` en el string de `.select()` — usar `select('*')`
- Git directo a master, sin feature branches
- Sin nuevas dependencias npm salvo que el task lo indique explícitamente
- TypeScript strict: no `any`, no `as unknown as X` salvo cast explícito justificado
- `cn` se importa de `'cn'`, no de `'@/lib/utils'`

## Review Focus

1. **Comunicados double-send**: verificar que si `enviado_at` ya está seteado, el endpoint retorne 409 Y que el cliente lo maneje con toast de error apropiado.
2. **Session guard**: verificar que no entre en loop infinito si `/login` también retorna 401.
3. **Branding público**: verificar que no exponga datos más allá de nombre + logo (no `id`, no datos internos).
4. **Onboarding checklist**: verificar que se oculta correctamente cuando todos los steps están completos — no debe aparecer en instituciones maduras.
5. **Invite email**: verificar que no manda email doble si el usuario ya fue invitado previamente (mismo link, no nuevo email).

---

### Task 1: Security micro-fixes

**Files:**
- Modify: `src/app/api/v1/instituciones/[id]/usuarios/route.ts` (POST — agregar deleted_at check)
- Modify: `src/app/api/v1/instituciones/branding/route.ts` (remover auth check)
- Modify: `src/app/api/v1/debug/test-email/route.ts` (VERCEL_ENV en lugar de NODE_ENV)

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Fix usuarios POST — institution deleted_at check**

En `instituciones/[id]/usuarios/route.ts`, `POST` handler, después de `if (!isSuperadmin && !hasRole...)` y antes de `const body = ...`:

```typescript
// Verify institution exists and is not deleted
const { data: instCheck } = await createAdminClient()
  .from('instituciones')
  .select('id')
  .eq('id', institucion_id)
  .is('deleted_at', null)
  .single()
if (!instCheck) return Err.notFound('Institución no encontrada')
```

Nota: `createAdminClient()` ya se importa. Asignar a `const adminForCheck = createAdminClient()` o usar el existente si ya está declarado más abajo.

- [ ] **Step 2: Branding endpoint — hacer público**

En `instituciones/branding/route.ts`, remover:
```typescript
import { getSession } from '@/lib/auth'
// ...
const session = await getSession()
if (!session) return Err.unauthorized()
```

La ruta queda: valida `slug` query param → consulta `instituciones` → retorna `nombre, logo_cuadrado_url, logo_rectangular_url`. Sin auth.

- [ ] **Step 3: Debug email — VERCEL_ENV**

En `src/app/api/v1/debug/test-email/route.ts`, cambiar:
```typescript
// De:
if (process.env.NODE_ENV === 'production') return Err.notFound('Not found')
// A:
if (process.env.VERCEL_ENV === 'production') return Err.notFound('Not found')
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/instituciones/[id]/usuarios/route.ts \
        src/app/api/v1/instituciones/branding/route.ts \
        src/app/api/v1/debug/test-email/route.ts
git commit -m "fix: security micro-fixes — institution deleted check, public branding, VERCEL_ENV debug"
```

---

### Task 2: Google SSO — forgot-password UX

**Files:**
- Modify: `src/app/(auth)/forgot-password/page.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Actualizar mensaje de éxito en forgot-password**

En `forgot-password/page.tsx`, en el bloque `{sent ? (...)}`, agregar después del mensaje principal de "Revisá tu bandeja":

```tsx
<p className="text-sm text-muted-foreground mt-2">
  ¿Tu cuenta usa Google? No necesitás contraseña.{' '}
  <Link href="/login" className="underline">Ingresá con Google</Link> desde la pantalla de inicio.
</p>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(auth)/forgot-password/page.tsx
git commit -m "ux: forgot-password indica opcion Google para usuarios SSO"
```

---

### Task 3: Comunicados double-send prevention (migration + API)

**Files:**
- Migration: `enviado_at` en `comunicados`
- Modify: `src/app/api/v1/comunicados/route.ts`
- Modify: `src/types/database.ts` (agregar `enviado_at` a `comunicados`)

**Interfaces:**
- Produces: `comunicados.enviado_at: string | null` — consumido por Task 4 (email batching) y UI

- [ ] **Step 1: Migration**

```sql
ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS enviado_at timestamptz;
```

Via `mcp__supabase__apply_migration` con name `add_enviado_at_to_comunicados`.

- [ ] **Step 2: Actualizar database.ts**

En `src/types/database.ts`, en la tabla `comunicados`, agregar `enviado_at: string | null` en Row, `enviado_at?: string | null` en Insert y Update.

- [ ] **Step 3: API — check + set enviado_at**

En `comunicados/route.ts`, `POST` handler, después de insertar el comunicado y antes de fetch responsables:

```typescript
// Check: already sent?
if (comunicado.enviado_at) {
  return Err.conflict('Este comunicado ya fue enviado')
}
```

Y justo antes del `Promise.all` de emails, actualizar `enviado_at`:

```typescript
await supabase
  .from('comunicados')
  .update({ enviado_at: new Date().toISOString() })
  .eq('id', comunicado.id)
```

El INSERT del comunicado necesita incluir `enviado_at` en el select:
```typescript
.select('id, titulo, contenido, curso_id, created_at, enviado_at')
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/comunicados/route.ts src/types/database.ts
git commit -m "feat: comunicados double-send prevention via enviado_at"
```

---

### Task 4: Email batching con Resend batch API

**Files:**
- Modify: `src/app/api/v1/comunicados/route.ts`
- Modify: `src/lib/email.ts` (agregar `sendComunicadoBatch`)

**Interfaces:**
- Consumes: `comunicados.enviado_at` de Task 3
- Produces: `sendComunicadoBatch(emails: BatchEmailItem[])` exportado de `@/lib/email`

Primero leer `src/lib/email.ts` para entender la firma de `sendComunicado`.

- [ ] **Step 1: Agregar sendComunicadoBatch en email.ts**

Resend v6 batch API: `resend.batch.send(emails[])` donde cada item tiene `from, to, subject, react`. Máximo 100 por llamada.

```typescript
export async function sendComunicadoBatch(
  items: Array<{
    email: string
    titulo: string
    contenido: string
    institucion_nombre: string
    confirm_url: string
    logo_url?: string
    confId: string
  }>
): Promise<void> {
  const CHUNK = 100
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK)
    await resend.batch.send(
      chunk.map(item => ({
        from: FROM_EMAIL, // usar la constante existente
        to: item.email,
        subject: `Nuevo comunicado: ${item.titulo}`,
        react: ComunicadoEmail({ ...item }), // componente existente
      }))
    ).catch(console.error)
  }
}
```

Adaptarse a la firma real del componente `ComunicadoEmail` y la constante `FROM_EMAIL` que ya existen en `email.ts`.

- [ ] **Step 2: Usar sendComunicadoBatch en route.ts**

Reemplazar el `Promise.all(responsables.map(r => sendComunicado(...)))` por:

```typescript
void sendComunicadoBatch(
  responsables.map(r => ({
    email: r.email,
    titulo,
    contenido,
    institucion_nombre,
    confirm_url: `${appUrl}/confirmar/${confByPersona.get(r.persona_id)}`,
    logo_url,
    confId: confByPersona.get(r.persona_id)!,
  }))
)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts src/app/api/v1/comunicados/route.ts
git commit -m "perf: email batch send para comunicados via Resend batch API"
```

---

### Task 5: Invite resend envía email

**Files:**
- Modify: `src/app/api/v1/instituciones/[id]/usuarios/[persona_id]/invite/route.ts`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Leer la ruta de invite**

Ya leída en sesión. El route genera el link y retorna `{ link }` pero no manda email.

- [ ] **Step 2: Agregar sendBienvenida al invite route**

Importar `sendBienvenida` desde `@/lib/email`. Después de generar el link, agregar:

```typescript
// Fetch persona + memberships para datos del email
const { data: membership } = await admin
  .from('memberships')
  .select('rol, instituciones(nombre, logo_rectangular_url)')
  .eq('persona_id', persona_id)
  .eq('institucion_id', institucion_id)
  .single()

const inst = membership?.instituciones as { nombre: string; logo_rectangular_url: string | null } | null
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://libretadigital.app').replace(/\/$/, '')

void sendBienvenida(persona.email, {
  nombre: persona.nombre ?? persona.email,
  email: persona.email,
  institucion_nombre: inst?.nombre ?? '',
  rol: membership?.rol ?? 'responsable',
  login_url: `${appUrl}/login`,
  setup_url: linkData?.properties?.action_link,
  logo_url: inst?.logo_rectangular_url ?? undefined,
})
```

Nota: `persona` ya se consulta arriba con `select('email, auth_id')` — agregar `nombre` al select: `select('email, auth_id, nombre')`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/v1/instituciones/[id]/usuarios/[persona_id]/invite/route.ts"
git commit -m "feat: invite resend ahora reenvía email de bienvenida con nuevo link"
```

---

### Task 6: Session expirada — redirect a login

**Files:**
- Create: `src/components/session-guard.tsx`
- Modify: `src/app/dashboard/layout.tsx` (agregar SessionGuard)

**Interfaces:**
- Produces: `<SessionGuard />` client component que monta en dashboard layout

Primero leer `src/app/dashboard/layout.tsx` para entender la estructura actual.

- [ ] **Step 1: Crear SessionGuard**

```typescript
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SessionGuard() {
  const router = useRouter()
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          router.push('/login?session=expired')
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [router])
  return null
}
```

- [ ] **Step 2: Montar en dashboard layout**

En `src/app/dashboard/layout.tsx`, importar `SessionGuard` y agregar `<SessionGuard />` dentro del JSX (client component se puede usar en server layout).

- [ ] **Step 3: Mostrar mensaje en login si session=expired**

En `src/app/(auth)/login/page.tsx`, leer searchParam `session` y mostrar un `<Alert>` tipo warning si `session === 'expired'`.

- [ ] **Step 4: Commit**

```bash
git add src/components/session-guard.tsx src/app/dashboard/layout.tsx src/app/(auth)/login/page.tsx
git commit -m "feat: session guard — redirect a login cuando token expira"
```

---

### Task 7: EmptyState component + páginas clave

**Files:**
- Create: `src/components/ui/empty-state.tsx`
- Modify: `src/app/dashboard/[slug]/alumnos/page.tsx`
- Modify: `src/app/dashboard/[slug]/personal/page.tsx`
- Modify: `src/app/dashboard/[slug]/responsables/page.tsx`

**Interfaces:**
- Produces: `<EmptyState icon={} title="" description="" action={} />` reutilizable

- [ ] **Step 1: Crear EmptyState component**

```typescript
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Aplicar en alumnos page**

En `alumnos/page.tsx`, donde hoy muestra la tabla: si `tableRows.length === 0` (después de filtros), mostrar:
```tsx
<EmptyState 
  icon={GraduationCap}
  title="Sin alumnos"
  description="Agregá el primer alumno para empezar."
  action={<NuevoAlumnoButton instId={inst.id} />}
/>
```

Verificar qué componente maneja "nuevo alumno" y usarlo.

- [ ] **Step 3: Aplicar en personal y responsables pages**

Similar a alumnos — cuando `memberships?.length === 0 || memberships?.filter(m => m.activo).length === 0`:

Personal:
```tsx
<EmptyState icon={UserCog} title="Sin personal" description="Agregá docentes y administradores." action={<NuevoUsuarioSheet ... />} />
```

Responsables:
```tsx
<EmptyState icon={UsersRound} title="Sin responsables" description="Agregá responsables de alumnos." action={<NuevoUsuarioSheet ... />} />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/empty-state.tsx \
        "src/app/dashboard/[slug]/alumnos/page.tsx" \
        "src/app/dashboard/[slug]/personal/page.tsx" \
        "src/app/dashboard/[slug]/responsables/page.tsx"
git commit -m "ux: EmptyState component + aplicar en alumnos, personal, responsables"
```

---

### Task 8: Admin onboarding checklist

**Files:**
- Create: `src/app/dashboard/[slug]/onboarding-checklist.tsx`
- Modify: `src/app/dashboard/[slug]/home-admin.tsx`

**Interfaces:**
- Consumes: `instId`, `slug`, counts ya calculados en `home-admin` (alumnosActivos, docentesCount, cursosCount, añoActivo)
- Produces: `<OnboardingChecklist />` que se monta condicionalmente en `home-admin`

- [ ] **Step 1: Crear OnboardingChecklist**

Server component que recibe los datos ya calculados. Muestra checklist con 5 steps:
1. ✅/⬜ Año lectivo activo creado (`!!añoActivo`)
2. ✅/⬜ Al menos un curso (`cursosCount > 0`)
3. ✅/⬜ Al menos una materia (query nueva: `COUNT materias WHERE curso_id IN cursoIds`)
4. ✅/⬜ Al menos un alumno (`alumnosActivos.length > 0`)
5. ✅/⬜ Al menos un docente (`docentesCount > 0`)

Si todos los steps están completos, el componente retorna `null` (no renderiza nada).

Props:
```typescript
interface Props {
  slug: string
  tieneAño: boolean
  tieneCursos: boolean
  tieneMaterias: boolean
  tieneAlumnos: boolean
  tieneDocentes: boolean
}
```

Cada step pendiente: link al lugar para resolverlo.
Estilo: card con borde, fondo `bg-amber-50 dark:bg-amber-950/20`, título "Primeros pasos".

- [ ] **Step 2: Calcular tieneMaterias en home-admin**

En `home-admin.tsx`, agregar a las queries paralelas:
```typescript
cursoIds.length > 0
  ? supabase.from('materias').select('id', { count: 'exact', head: true }).in('curso_id', cursoIds).is('deleted_at', null)
  : Promise.resolve({ count: 0 })
```

- [ ] **Step 3: Montar condicionalmente**

En `home-admin.tsx`, al inicio del JSX, antes de las stats cards:
```tsx
{(!tieneAño || !tieneCursos || !tieneMaterias || !tieneAlumnos || !tieneDocentes) && (
  <OnboardingChecklist ... />
)}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/dashboard/[slug]/onboarding-checklist.tsx" \
        "src/app/dashboard/[slug]/home-admin.tsx"
git commit -m "feat: onboarding checklist para nuevas instituciones en home admin"
```

---

### Task 9: Notificaciones paginación

**Files:**
- Modify: `src/app/api/v1/notificaciones/route.ts`
- Modify: `src/components/notification-bell.tsx` (o wherever the bell fetches)

**Interfaces:**
- Consumes: nothing
- Produces: `GET /notificaciones?limit=50&offset=N`

Leer los archivos antes de implementar.

- [ ] **Step 1: API — agregar offset param**

En `notificaciones/route.ts`, leer `offset` del query string (default `0`), agregar `.range(offset, offset + limit - 1)` al query.

- [ ] **Step 2: Bell component — "cargar más"**

Si el bell fetches notificaciones, agregar estado `offset` y botón "Ver más" que incrementa offset y hace append al array de notificaciones.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/notificaciones/route.ts src/components/notification-bell.tsx
git commit -m "feat: paginacion en notificaciones — offset param + cargar mas en bell"
```

---

### Task 10: UX polish — logout confirmation + m4/m7

**Files:**
- Modify: `src/components/app-sidebar.tsx` (logout confirmation)
- Modify: `src/app/api/v1/comunicados/route.ts` (devolver warning si no hay responsables)

**Interfaces:**
- Consumes: `ConfirmDialog` de `@/components/ui/confirm-dialog`
- Produces: nothing

- [ ] **Step 1: Logout confirmation en sidebar**

En `app-sidebar.tsx`, agregar estado `logoutOpen: boolean`. El click del botón inline de logout abre el dialog en lugar de llamar directamente a `handleLogout`. Usar `ConfirmDialog` con:
- `title="¿Cerrar sesión?"`
- `confirmLabel="Cerrar sesión"`
- `destructive={false}`

- [ ] **Step 2: Comunicados — warning si no hay responsables**

En `comunicados/route.ts`, si `responsables.length === 0` después de deduplicar:

```typescript
// No hay responsables con email — retornar warning en lugar de created vacío
return ok({ ...comunicado, emails_enviados: 0, warning: 'Ningún responsable tiene email registrado' })
```

El cliente mostrará este warning como un toast de tipo `warning` en lugar de éxito silencioso.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-sidebar.tsx src/app/api/v1/comunicados/route.ts
git commit -m "ux: logout confirmation dialog + warning cuando no hay responsables en comunicados"
```
