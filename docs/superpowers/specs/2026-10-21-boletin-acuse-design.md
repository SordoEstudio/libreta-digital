# Boletín — Acuse de recibo digital

**Fecha:** 2026-10-21  
**Estado:** Spec aprobada, pendiente plan de implementación

---

## Contexto y motivación

El boletín (libreta de calificaciones) hoy es una vista de solo lectura. No queda registro de que el responsable lo vio ni lo "firmó". En las escuelas argentinas el proceso manual es: docente entrega boletín impreso → responsable firma al pie → devuelve a la institución.

Este módulo digitaliza ese acuse. Un responsable puede confirmar recepción desde la pantalla de libreta. El admin puede ver qué familias confirmaron y cuáles no, sin depender de papel.

---

## Objetivo

Permitir que cada responsable confirme haber recibido el boletín de un alumno en un período determinado, y que los administradores puedan ver el estado de esa confirmación por alumno y período.

---

## Goals

- Responsable puede hacer "acuse de recibo" del boletín desde la libreta, una vez por alumno por período
- El acuse queda asociado a la persona (no al usuario), es inmutable y timestamped
- Admin puede ver, por alumno, qué responsables confirmaron y cuándo
- Admin puede ver un resumen por período: cuántos alumnos tienen al menos un responsable que confirmó
- El acuse no requiere que el período esté cerrado (puede confirmarse en cualquier momento)

## Non-goals

- Firma digital con validez legal
- Notificaciones automáticas por email cuando el responsable confirma
- Recordatorios automáticos a responsables que no confirmaron
- Soporte para múltiples rondas de confirmación por período (un acuse por responsable por período es suficiente)
- El acuse modifica el estado del período (cerrado/abierto)

## Anti-goals

- No mostrar quién no confirmó en la vista del responsable (solo el admin ve el estado global)
- No bloquear acceso al boletín si no hay acuse previo

---

## Schema de base de datos

### Nueva tabla: `boletin_acuses`

```sql
create table boletin_acuses (
  id               uuid primary key default gen_random_uuid(),
  alumno_id        uuid not null references alumnos(id),
  año_lectivo_id   uuid not null references años_lectivos(id),
  periodo_id       uuid references periodos(id),  -- null = acuse anual (periodo anual)
  persona_id       uuid not null references personas(id),
  confirmed_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (alumno_id, año_lectivo_id, periodo_id, persona_id)
);
```

**Notas de diseño:**
- `periodo_id = null` representa el acuse del boletín anual (mismo patrón que `isAnual` en el cuaderno)
- El unique constraint evita doble confirmación; el frontend lo trata como idempotente (no error visible al usuario si ya existe)
- No tiene `deleted_at` — los acuses son inmutables

### RLS

```sql
-- Responsables: pueden insertar acuses para alumnos a su cargo
create policy "responsable puede insertar acuse de su alumno"
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

-- Responsables: pueden leer sus propios acuses
create policy "responsable puede leer sus acuses"
on boletin_acuses for select
to authenticated
using (
  exists (
    select 1 from memberships m
    where m.persona_id = boletin_acuses.persona_id
      and m.user_id = auth.uid()
  )
);

-- Admin: puede leer todos los acuses de su institución
create policy "admin puede leer acuses de su institucion"
on boletin_acuses for select
to authenticated
using (
  exists (
    select 1 from alumnos a
    join memberships m on m.institucion_id = a.institucion_id
    where a.id = boletin_acuses.alumno_id
      and m.user_id = auth.uid()
      and m.rol in ('admin', 'superadmin')
  )
);
```

---

## Flujos de usuario

### Flujo del responsable

1. Entra a la libreta de su alumno (`/dashboard/[slug]/libreta/[alumnoId]`)
2. Selecciona un período (o el período activo se muestra por defecto)
3. Al final de la vista del período aparece la sección **"Acuse de recibo"**
4. Si no confirmó: botón "Confirmar que recibí este boletín"
   - Click → POST a `/api/v1/boletin-acuses` con `{ alumno_id, año_lectivo_id, periodo_id }`
   - Respuesta 201 o 409 (ya existe) → mostrar estado confirmado
5. Si ya confirmó: badge "Boletín confirmado ✓" con fecha de confirmación

El botón y el badge son por período. Si el responsable tiene múltiples alumnos, cada uno tiene su acuse independiente.

### Flujo del admin — vista individual

1. Admin abre libreta de un alumno (desde `/dashboard/[slug]/alumnos`)
2. En el panel de la libreta, tab o sección "Acuses"
3. Lista de responsables del alumno con estado por período:
   - Nombre del responsable
   - Período
   - Estado: `Confirmado — 22/10/2026` o `Sin confirmar`

### Flujo del admin — vista resumen

1. En `/dashboard/[slug]/acuses` (nueva página)
2. Filtros: año lectivo + período
3. Tabla de alumnos con columna "Confirmaciones": `2/2 responsables` o `0/1 responsable`
4. Exportable a CSV: alumno, curso, responsable, fecha de acuse

---

## Páginas y componentes nuevos

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/app/api/v1/boletin-acuses/route.ts` | API route | POST para crear acuse; GET para leer acuses del responsable actual |
| `src/app/api/v1/instituciones/[id]/boletin-acuses/route.ts` | API route | GET para admin: acuses por institución, filtrable por período |
| `src/components/boletin/acuse-button.tsx` | Client component | Botón de confirmación con estado optimista |
| `src/app/dashboard/[slug]/acuses/page.tsx` | Server page | Resumen de acuses para admin |

### Modificaciones a páginas existentes

| Archivo | Cambio |
|---|---|
| `src/app/dashboard/[slug]/libreta/[alumnoId]/page.tsx` | Agregar sección de acuse al final de la vista de período (solo si `isResponsable`) |
| `src/app/dashboard/[slug]/libreta/[alumnoId]/page.tsx` | Agregar panel de acuses en vista admin |
| `src/components/app-sidebar.tsx` | Agregar link "Acuses" en menú admin (bajo Configuración) |

---

## Diseño del componente `AcuseButton`

```tsx
'use client'
// Props: alumnoId, añoLectivoId, periodoId, existingAcuse?: { confirmed_at: string }
// Estado: idle | confirming | confirmed | error
// Behaviour: POST a /api/v1/boletin-acuses; 409 tratado como éxito (ya confirmó)
// UI confirmed: badge verde con fecha; no botón de deshacer
```

El componente es optimista: pasa a estado `confirmed` inmediatamente al click, revierta a `idle` con error message si la API falla.

---

## Diseño de la página admin `/acuses`

- Selector año lectivo + período (todos los períodos del año activo, más "Anual")
- Tabla: alumno | curso | responsables | confirmaciones | acción
- Columna "confirmaciones": `n/total respondieron` con barra de progreso visual
- Click en fila: drawer lateral con detalle de responsables y fechas
- Botón "Exportar CSV": descarga la tabla filtrada

---

## Consideraciones de seguridad

- El responsable solo puede crear acuses para alumnos en `alumno_responsables` con su `persona_id`
- El `persona_id` en el acuse se deriva del servidor (no del cuerpo del request) para prevenir suplantación
- Admin solo lee acuses de alumnos de su institución
- No existe endpoint de DELETE para acuses

---

## Open questions resueltas

**¿Acuse por período o por año completo?**  
→ Por período, con `periodo_id = null` para el anual. Mismo patrón que el cuaderno. Permite confirmar cada trimestre independientemente.

**¿Un acuse o múltiples por responsable?**  
→ Uno por responsable por alumno por período. El unique constraint lo enforce. Si hay dos responsables (padre y madre) ambos pueden confirmar independientemente.

**¿Requiere que el período esté cerrado?**  
→ No. El boletín es accesible en cualquier momento; el acuse también.

**¿Se muestra en la libreta del responsable incluso si no hay acuse habilitado?**  
→ Siempre visible si hay períodos con notas. No requiere feature flag adicional (usa el mismo `modulo_contenidos` / futura configuración per-institución si se necesita ocultar).
