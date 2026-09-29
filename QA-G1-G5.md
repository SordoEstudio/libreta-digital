# QA — Fase G (G1–G5): Funcional crítico

> **Rama:** `feat/g1-g5-functional`  
> **Fecha:** 2026-09-29

> **Leyenda de estado:**  
> ☐ pendiente · ✅ ok · ❌ falla · ⏸ bloqueado (requiere dominio)

---

## ⚠️ Acciones manuales antes de testear en prod

| # | Acción | Por qué |
|---|--------|---------|
| M1 | Verificar `NEXT_PUBLIC_APP_URL` en Vercel → Settings → Env Vars | El recovery link usa esta variable. Si es incorrecto, el email de bienvenida apunta a la URL equivocada. |
| M2 | ⏸ Revisar Resend dashboard después del primer usuario creado | **Requiere dominio propio.** Confirmar que el email con botón "Crear contraseña" llega con link válido. |
| M3 | ⏸ Test de punta a punta: crear usuario → click link → set password → login | **Requiere dominio propio** para que Resend envíe emails. |
| M4 | Aplicar migración si hay cambios de schema pendientes | No hay migraciones nuevas en G1–G5, pero confirmar que `alumno_responsables` tiene las RLS de migration 11 aplicadas en prod. |

---

## G1 — Invite / onboarding flow

### Pre-condición
- Institución creada, admin logueado.

| # | Test | Resultado |
|---|------|-----------|
| G1.1 | Admin crea usuario nuevo (email, nombre, rol) → respuesta 201 | ☐ |
| G1.2 | ⏸ Email recibido tiene botón **"Crear contraseña"** (no "Ingresar") | ⏸ requiere dominio Resend |
| G1.3 | ⏸ Click en botón del email → redirige a `/update-password` autenticado | ⏸ requiere dominio Resend |
| G1.4 | `/update-password`: contraseñas no coinciden → alerta de error visible, no redirige | ☐ |
| G1.5 | `/update-password`: contraseña < 8 caracteres → alerta, no redirige | ☐ |
| G1.6 | `/update-password`: contraseña válida → redirige a `/dashboard` | ☐ |
| G1.7 | ⏸ Admin agrega usuario existente → NO recibe email de setup | ⏸ requiere dominio Resend |
| G1.8 | `/login`: link **"¿Olvidaste tu contraseña?"** visible debajo del botón Ingresar | ☐ |
| G1.9 | `/forgot-password`: email válido → muestra mensaje de confirmación | ☐ |
| G1.10 | ⏸ `/forgot-password`: click en link del email → redirige a `/update-password` | ⏸ requiere dominio Resend |

---

## G2 — Años lectivos + periodos UI

### Pre-condición
- Admin logueado en institución.

| # | Test | Resultado |
|---|------|-----------|
| G2.1 | Sidebar admin muestra item **"Configuración"** con ícono Settings | ☐ |
| G2.2 | `/configuracion` muestra card "Años lectivos" con botón "Gestionar" | ☐ |
| G2.3 | `/configuracion/años-lectivos` sin años → empty state "Sin años lectivos. Creá el primero." | ☐ |
| G2.4 | Crear año lectivo `"2026"` con plantilla **Trimestral** → aparece card con 3 períodos (1er, 2do, 3er Trimestre) | ☐ |
| G2.5 | Crear año lectivo con plantilla **Semestral** → aparece card con 2 períodos | ☐ |
| G2.6 | Crear año lectivo con plantilla **Sin períodos** → card sin badges de períodos | ☐ |
| G2.7 | Crear año con checkbox "Marcar como año activo" → badge **Activo** visible; no muestra botón "Activar" | ☐ |
| G2.8 | Año inactivo muestra botón **"Activar"** → click → ese año queda activo, el anterior pierde badge | ☐ |
| G2.9 | Página **Cursos** muestra el nombre del año activo en el subtítulo | ☐ |
| G2.10 | Sin año activo → Cursos muestra "No hay año lectivo activo." con empty state | ☐ |
| G2.11 | Docente/responsable NO ve "Configuración" en sidebar | ☐ |

---

## G3 — Materias + asignación docente UI

### Pre-condición
- Institución con año activo, al menos un curso creado, al menos un usuario con rol docente.

| # | Test | Resultado |
|---|------|-----------|
| G3.1 | Admin entra a detalle de curso → botón **"Nueva materia"** visible | ☐ |
| G3.2 | Docente (sin admin) entra a detalle de curso → **NO** ve botón "Nueva materia" | ☐ |
| G3.3 | Sheet "Nueva materia" se abre al click | ☐ |
| G3.4 | Sheet carga lista de docentes de la institución al abrirse | ☐ |
| G3.5 | Crear materia sin docente → aparece en lista de materias del curso | ☐ |
| G3.6 | Crear materia con docente asignado → nombre del docente aparece en card de materia | ☐ |
| G3.7 | Click en materia → abre página de evaluaciones de esa materia | ☐ |
| G3.8 | Sin docentes en institución → select muestra "Sin docentes registrados" | ☐ |

---

## G4 — Vincular responsable ↔ alumno

### Pre-condición
- Al menos un alumno y al menos un usuario con rol responsable en la institución.

| # | Test | Resultado |
|---|------|-----------|
| G4.1 | Tabla de alumnos: columna Acciones muestra botón **"Responsable"** (ícono UserPlus) | ☐ |
| G4.2 | Click en botón → sheet "Asignar responsable" se abre | ☐ |
| G4.3 | Sheet muestra nombre del alumno en subtítulo | ☐ |
| G4.4 | Sheet carga lista de responsables de la institución | ☐ |
| G4.5 | Sin responsables → select muestra "Sin responsables registrados" | ☐ |
| G4.6 | Seleccionar responsable y confirmar → toast "Responsable asignado" | ☐ |
| G4.7 | Asignar el mismo responsable dos veces al mismo alumno → toast de error "ya está vinculado" | ☐ |
| G4.8 | `GET /api/v1/alumnos/[id]/responsables` retorna 200 con nombre y email del responsable | ☐ |

---

## G5 — Vista responsable: Mis alumnos

### Pre-condición
- Usuario con rol responsable, vinculado a al menos un alumno (vía G4).

| # | Test | Resultado |
|---|------|-----------|
| G5.1 | Sidebar responsable muestra item **"Mis alumnos"** con ícono GraduationCap | ☐ |
| G5.2 | Admin/docente (sin rol responsable) **NO** ven "Mis alumnos" en sidebar | ☐ |
| G5.3 | `/mis-alumnos` sin alumnos vinculados → empty state con mensaje de contactar admin | ☐ |
| G5.4 | Con alumno vinculado → card muestra nombre, badge de curso, badge Activo/Inactivo | ☐ |
| G5.5 | Click **"Ver libreta"** → abre `/dashboard/[slug]/libreta/[alumno_id]` | ☐ |
| G5.6 | Libreta muestra notas del alumno (o empty state si no tiene) | ☐ |
| G5.7 | Responsable accede a libreta de alumno no vinculado → redirige a `/dashboard` | ☐ |

---

## Flujo de punta a punta (smoke test)

Cubrir el caso de primer cliente real:

**Pasos 4, 8 requieren dominio Resend** (email delivery). Hasta entonces, testear con usuarios creados manualmente en Supabase Auth con contraseña ya seteada.

```
1. Superadmin crea institución
2. Admin crea año lectivo con períodos trimestral → activa año
3. Admin crea cursos
4. ⏸ Admin agrega docente → docente recibe email → crea contraseña → logra ingresar
   (sin dominio: crear usuario en Supabase Auth manualmente con contraseña, luego agregar membership)
5. Admin crea materias en cada curso → asigna docente
6. Admin agrega alumnos
7. Admin agrega responsable → asigna a alumno
8. ⏸ Responsable recibe email → crea contraseña → ingresa → ve "Mis alumnos" → ve libreta (vacía)
   (sin dominio: ídem paso 4)
9. Docente ingresa → va a Cursos → entra a materia → crea evaluación → carga notas
10. Responsable refresca libreta → ve notas cargadas
```

---

## Notas de regresión

- ⏸ Flujo de login Google: **requiere dominio** para configurar OAuth redirect URI en Google Console
- Cursos: turno/nivel siguen funcionando con valores `mañana|tarde|noche`
- Evaluaciones: peso/ponderación removidos — confirmar que no queda referencia visible
- Rol múltiple (admin+docente): verificar que admin que también es docente ve ambas secciones del sidebar
