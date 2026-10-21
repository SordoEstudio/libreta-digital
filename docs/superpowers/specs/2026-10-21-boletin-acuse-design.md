# Boletín — Acuse de recibo digital

**Fecha:** 2026-10-21  
**Estado:** Spec aprobada, pendiente plan de implementación

---

## Contexto y motivación

El boletín (libreta de calificaciones) hoy es una vista de solo lectura. No queda registro de que el responsable lo vio ni lo "firmó". En las escuelas argentinas el proceso manual es: docente entrega boletín impreso → responsable firma al pie → devuelve a la institución.

Este módulo digitaliza ese acuse. El cierre de un período lo "publica" para los responsables — antes del cierre no ven nada de ese período. Al ingresar al boletín por primera vez desde el cierre, confirman recepción en una pantalla intermedia. El admin puede ver qué familias confirmaron y cuáles no, por período.

---

## Objetivo

- Gating de visibilidad: responsables solo acceden a períodos publicados (cerrados)
- Acuse obligatorio: pantalla intermedia antes de mostrar el boletín cuando hay períodos cerrados sin confirmar
- Registro inmutable por período: admin puede ver quién confirmó y cuándo

---

## Goals

- Responsables solo ven períodos donde `cerrado_at IS NOT NULL`
- Al entrar al boletín con períodos cerrados sin confirmar → pantalla de confirmación previa (no se puede saltear)
- La confirmación cubre todos los períodos cerrados sin acuse previo en ese acceso (batch)
- Una vez confirmado, el flujo es exactamente el mismo que hoy — acceso libre al boletín
- Si se cierra un período nuevo posterior → nueva confirmación requerida la próxima vez que ingresen
- Acuse es por período: `unique (alumno_id, periodo_id, persona_id)`
- Admin ve estado de acuse por alumno y período
- Si hay dos responsables (padre y madre) cada uno confirma independientemente

## Non-goals

- Firma digital con validez legal
- Notificaciones por email al confirmar
- Recordatorios automáticos a quienes no confirmaron
- El acuse modifica el estado del período

## Anti-goals

- No mostrar quién no confirmó en la vista del responsable (solo el admin ve el estado global)
- No permitir ver el boletín sin confirmar (la confirmación es el gate de acceso)

---

## Lógica de visibilidad y gate de confirmación

### Qué ve el responsable en la libreta

Solo períodos con `cerrado_at IS NOT NULL`. Los períodos abiertos no aparecen en el selector ni en la vista.

Si ningún período está cerrado → la libreta muestra un estado vacío: "Aún no hay períodos publicados".

### Gate de confirmación

Cada vez que un responsable accede a `/dashboard/[slug]/libreta/[alumnoId]`:

1. Buscar períodos cerrados del año activo para ese alumno
2. Filtrar los que **no tienen acuse** de esta persona
3. Si hay alguno → redirigir a `/dashboard/[slug]/libreta/[alumnoId]/confirmar` con los períodos pendientes
4. Si no hay ninguno → mostrar el boletín directamente (flujo normal)

La pantalla de confirmación lista los períodos pendientes: "Períodos disponibles: 1° trimestre, 2° trimestre. Al continuar confirmás haber recibido el boletín."

Botón "Confirmar y ver boletín" → batch insert de acuses para todos esos períodos → redirect al boletín.

### Escenario ejemplo

| Evento | Estado |
|---|---|
| Período 1 se cierra | Responsable entra → pantalla de confirmación (período 1) → confirma → ve P1 |
| Período 2 se cierra | Responsable entra → pantalla de confirmación (período 2 solamente) → confirma → ve P1 y P2 |
| Responsable entra de nuevo sin nuevos cierres | Entra directo al boletín, sin pantalla intermedia |

---

## Schema de base de datos

### Nueva tabla: `boletin_acuses`

```sql
create table boletin_acuses (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references alumnos(id),
  periodo_id     uuid not null references periodos(id),
  persona_id     uuid not null references personas(id),
  confirmed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (alumno_id, periodo_id, persona_id)
);
```

**Notas:**
- `periodo_id` siempre es un período real (no null) — el acuse es por período cerrado
- No tiene `deleted_at` — los acuses son inmutables
- No necesita `año_lectivo_id` — se deriva de `periodos.año_lectivo_id`

### RLS

```sql
-- Responsables: insertar acuse solo para alumnos a su cargo
create policy "responsable inserta acuse de su alumno"
on boletin_acuses for insert
to authenticated
with check (
  exists (
    select 1 from alumno_responsables ar
    join memberships m on m.persona_id = ar.persona_id
    where ar.alumno_id = boletin_acuses.alumno_id
      and ar.persona_id = boletin_acuses.persona_id
      and m.user_id = auth.uid()
      and m.rol = 'responsable'
  )
);

-- Responsables: leer sus propios acuses
create policy "responsable lee sus acuses"
on boletin_acuses for select
to authenticated
using (
  exists (
    select 1 from memberships m
    where m.persona_id = boletin_acuses.persona_id
      and m.user_id = auth.uid()
  )
);

-- Admin: leer todos los acuses de su institución
create policy "admin lee acuses de su institucion"
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

---

## Páginas y componentes

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/app/dashboard/[slug]/libreta/[alumnoId]/confirmar/page.tsx` | Server page | Pantalla intermedia de confirmación; redirige si no hay pendientes |
| `src/app/api/v1/boletin-acuses/route.ts` | API route | POST batch: inserta acuses para lista de periodo_ids; GET: acuses del responsable actual |
| `src/app/api/v1/instituciones/[id]/boletin-acuses/route.ts` | API route | GET admin: acuses filtrados por institución/período |
| `src/app/dashboard/[slug]/acuses/page.tsx` | Server page | Resumen de acuses para admin |

### Modificaciones a páginas existentes

| Archivo | Cambio |
|---|---|
| `src/app/dashboard/[slug]/libreta/[alumnoId]/page.tsx` | Filtrar períodos: solo mostrar los `cerrado_at IS NOT NULL`; estado vacío si ninguno cerrado; gate de confirmación (check acuses, redirect si pendientes) |
| `src/app/dashboard/[slug]/libreta/[alumnoId]/page.tsx` | Vista admin: agregar sección "Acuses" con estado por responsable por período |
| `src/components/app-sidebar.tsx` | Agregar link "Acuses" en menú admin |
| `src/components/bottom-tab-bar.tsx` | No cambios (acuses es solo admin) |

---

## Diseño de la pantalla de confirmación

Ruta: `/dashboard/[slug]/libreta/[alumnoId]/confirmar`

- Server component: verifica gate (si no hay pendientes → redirect al boletín)
- Muestra: nombre del alumno, lista de períodos pendientes de confirmar
- Botón "Confirmar y ver boletín" → POST a `/api/v1/boletin-acuses` con array de `periodo_id`s → redirect a `/libreta/[alumnoId]`
- No tiene botón de "cancelar" ni forma de saltear

```tsx
// Flujo server:
// 1. requireSession() → solo rol responsable puede acceder
// 2. Buscar periodos cerrados del alumno (año activo)
// 3. Buscar acuses existentes de esta persona para esos periodos
// 4. periodosPendientes = cerrados - ya_confirmados
// 5. Si periodosPendientes.length === 0 → redirect('/dashboard/[slug]/libreta/[alumnoId]')
// 6. Render pantalla con periodosPendientes
```

### Componente cliente de confirmación

```tsx
'use client'
// Props: alumnoId, periodosPendientes: { id, nombre }[], slug
// Estado: idle | loading | error
// Optimista: NO (redirect completo tras POST)
// POST body: { alumno_id, periodo_ids: string[] }
// 201 → router.replace('/dashboard/[slug]/libreta/[alumnoId]')
// Error → mostrar mensaje, habilitar reintento
```

---

## Diseño de la página admin `/acuses`

- Selector: año lectivo + período (dropdown)
- Tabla: alumno | curso | responsables confirmados / total | última confirmación
- Columna confirmaciones: `2/2 ✓` en verde, `0/1` en rojo, `1/2` en ámbar
- Click en fila → drawer: lista de responsables con `confirmed_at` o "Sin confirmar"
- Exportar CSV: alumno, curso, responsable, email, período, fecha de acuse

---

## Consideraciones de seguridad

- `persona_id` del acuse se deriva en el servidor del `session.persona_id` — no del body del request
- El gate verifica `alumno_responsables` antes de insertar
- Admin solo lee acuses de su institución (validado por la cadena `periodos → años_lectivos → instituciones`)
- No existe endpoint de DELETE ni UPDATE para acuses

---

## Open questions resueltas

**¿Acuse por período o por año?**
→ Por período. Cada cierre de período requiere su propia confirmación. Un batch insert cubre múltiples períodos cerrados simultáneamente.

**¿Período anual (null)?**
→ No aplica. El acuse es solo por períodos reales cerrados. La vista "anual" del cuaderno es para docentes, no para responsables.

**¿Visibilidad antes del cierre?**
→ Responsables no ven nada de un período hasta que `cerrado_at IS NOT NULL`.

**¿Nuevo período cerrado después de que el responsable ya confirmó los anteriores?**
→ Sí requiere nueva confirmación. El gate se evalúa en cada acceso.

**¿Dos responsables del mismo alumno?**
→ Cada uno confirma independientemente. Dos acuses distintos, mismo alumno y período.
