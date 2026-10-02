# QA — Libreta Digital

Última actualización: 2026-10-02 · Branch base: `master` (`6d400ae`)

---

## Estado general

| Fase | Features | Estado |
|------|----------|--------|
| G1–G8 | Funcional crítico completo | ✅ Implementado |
| UX1 | Filtros y búsqueda | ✅ Implementado |
| UX2 | Home por rol | ✅ Implementado |
| UX3 | ConfirmDialog + consistencia | ✅ Implementado |
| UX4 | Diseño emails | ⏳ Pendiente |

---

## G — Funcional

### G1 · Invite flow
- [ ] Admin invita usuario → recibe email con link
- [ ] Link de invite redirige a registro correcto
- [ ] Usuario registrado aparece en lista con rol asignado
- [ ] Link copiado desde UI funciona

### G2 · Años y períodos
- [ ] Crear año lectivo desde configuración
- [ ] Crear períodos dentro de año
- [ ] Activar año → solo un año activo simultáneamente
- [ ] Eliminar año sin cursos → OK; con cursos → error claro
- [ ] Badge "Activo" / "Inactivo" correcto en config page
- [ ] Botón icono Settings → navega a `/configuracion/periodos`

### G3 · Materias
- [ ] Crear materia desde catálogo
- [ ] Asignar materia a curso
- [ ] Asignar docente a materia (AsignarDocenteSheet)
- [ ] Editar nombre de materia del catálogo
- [ ] Eliminar materia del catálogo sin instancias → ConfirmDialog → OK
- [ ] Eliminar materia con instancias → opción oculta (`hasInstancias = true`)
- [ ] Búsqueda por nombre en MateriasTabla funciona
- [ ] Contador "N de M" + Limpiar aparece al buscar

### G4 · Vincular responsable
- [ ] ResponsablesSheet abre desde fila de alumno
- [ ] Lista responsables actuales con relación, teléfono, DNI, dirección
- [ ] Agregar responsable existente → aparece en lista
- [ ] Editar datos de responsable (nombre, relación, teléfono, DNI, dirección)
- [ ] Desvincular → ConfirmDialog → desvincula correctamente
- [ ] ConfirmDialog no usa `window.confirm` nativo

### G5 · Mis alumnos (responsable)
- [ ] Responsable ve solo sus alumnos en `/mis-alumnos`
- [ ] Link a libreta de cada alumno funciona

### G6 · Edición usuarios
- [ ] EditarUsuarioSheet abre al hacer clic en ícono lápiz
- [ ] Form pre-cargado con datos actuales del usuario
- [ ] Guardar nombre, rol, teléfono, DNI, dirección → toast éxito + refresh
- [ ] Email shown as readonly (no editable)
- [ ] Desactivar acceso → ConfirmDialog → usuario queda inactivo (opacity-60 en tabla)
- [ ] Activar acceso → sin ConfirmDialog → usuario queda activo
- [ ] Superadmin no muestra botón editar en UsuariosTabla

### G7 · Responsables gestión completa
- [ ] Ver lista responsables por alumno
- [ ] Editar relación in-line
- [ ] Desvincular con confirmación
- [ ] Chips de responsables visibles en fila de alumno

### G8 · Crear responsable con asignación
- [ ] Al crear usuario con rol responsable, step 2 muestra multi-select de alumnos
- [ ] Alumnos seleccionados quedan vinculados al crear

---

## UX1 · Filtros y búsqueda

### Alumnos
- [ ] Búsqueda por nombre filtra en tiempo real
- [ ] Filtro por curso (select con cursos presentes en datos)
- [ ] Filtro "Sin curso" muestra alumnos sin inscripción activa
- [ ] Filtro por estado (Activo / Inactivo / Todos)
- [ ] Contador "N de M" aparece cuando hay filtros activos
- [ ] Botón "Limpiar" resetea todos los filtros
- [ ] Empty state "Sin alumnos" cuando no hay datos
- [ ] Empty state "Sin resultados" + link limpiar cuando filtros no matchean

### Usuarios
- [ ] Búsqueda por nombre y email
- [ ] Filtro por rol (Admin / Docente / Responsable)
- [ ] Filtro por estado
- [ ] Contador + Limpiar funcionan
- [ ] Empty states correctos

### Materias (catálogo)
- [ ] Búsqueda por nombre
- [ ] Contador + Limpiar funcionan
- [ ] Empty state "Sin resultados para X"

---

## UX2 · Home por rol

### Admin
- [ ] Stats row: alumnos activos, docentes activos, cursos (con nombre del año activo)
- [ ] Alerta "N alumnos sin curso" → link "Ver alumnos" navega a `/alumnos`
- [ ] Alerta "N materias sin docente" → link "Ver configuración" navega a `/configuracion`
- [ ] Sin alertas: badge verde "Todo en orden"
- [ ] Sin alumnos registrados: no muestra "Todo en orden"
- [ ] Accesos rápidos: Alumnos, Usuarios, Configuración

### Docente
- [ ] Lista de materias asignadas (solo las del docente)
- [ ] Por evaluación: "X sin nota" (amber) o "Completo" (green) o "Sin alumnos"
- [ ] Materias con más pendientes aparecen primero
- [ ] Badge total pendientes en header
- [ ] Botón "Cargar notas →" navega a `/materias/[id]/evaluaciones`
- [ ] Sin materias asignadas: empty state

### Responsable
- [ ] Alumnos a cargo listados con nombre y curso actual
- [ ] Notas del año activo agrupadas por materia
- [ ] Sin notas: mensaje "Sin notas cargadas este año"
- [ ] Sin año activo: mensaje "Sin año lectivo activo"
- [ ] Link "Ver libreta →" navega a `/libreta/[alumno_id]`
- [ ] Sin alumnos asignados: empty state

### Dispatch de roles
- [ ] Superadmin ve HomeAdmin
- [ ] Rol admin ve HomeAdmin
- [ ] Solo docente ve HomeDocente
- [ ] Solo responsable ve HomeResponsable
- [ ] Docente + admin ve HomeAdmin (admin tiene prioridad)

---

## UX3 · Confirmaciones y consistencia

### ConfirmDialog
- [ ] Ningún `window.confirm()` nativo en codebase
- [ ] Título y descripción correctos en cada uso
- [ ] "Cancelar" cierra sin acción
- [ ] Estado `loading` deshabilita ambos botones
- [ ] Variante `destructive` usa color rojo en botón confirmar
- [ ] ESC cierra sin acción

### Config page
- [ ] Botón icono Settings navega a periodos (no link de texto)
- [ ] ActivarAño y EliminarAño ausentes en config page principal
- [ ] Badge "Activo" / "Inactivo" correcto junto al selector de año
- [ ] ActivarAño y EliminarAño presentes en `/configuracion/periodos`
- [ ] EliminarAño usa `variant="destructive"`

---

## Flujos críticos end-to-end

### Flujo admin onboarding
1. [ ] Crear institución
2. [ ] Crear año lectivo + períodos
3. [ ] Invitar docente → recibe email
4. [ ] Crear curso
5. [ ] Asignar materia al curso
6. [ ] Asignar docente a materia
7. [ ] Crear alumno
8. [ ] Asignar alumno a curso
9. [ ] Home admin muestra stats correctos + sin alertas

### Flujo docente cargar notas
1. [ ] Home docente muestra materia con evaluaciones pendientes
2. [ ] Click "Cargar notas" → página de evaluaciones
3. [ ] Crear evaluación
4. [ ] Cargar notas para cada alumno
5. [ ] Home docente actualiza estado a "Completo"

### Flujo responsable ver libreta
1. [ ] Home responsable muestra alumno con notas del año activo
2. [ ] Click "Ver libreta" → libreta completa
3. [ ] Notas agrupadas por materia y evaluación

---

## Bugs corregidos

| Commit | Bug | Fix |
|--------|-----|-----|
| `6d400ae` | `home-docente`: link "Cargar notas" → `/notas?materia=` (404) | Redirige a `/materias/[id]/evaluaciones` |
| `6d400ae` | `PATCH /usuarios/[id]`: `.eq('activo', true)` bloqueaba reactivación de usuarios | Removido filtro |

---

## Limitaciones conocidas (aceptables MVP)

- `EditarUsuarioSheet`: no se puede vaciar un campo opcional existente (telefono/dni/dir) enviando cadena vacía — el PATCH ignora strings vacíos
- `home-admin` alertas "materias sin docente": incluye materias de todos los años, no solo el activo — puede ser ruidoso en instalaciones con historial
- Sin paginación en tablas — filtrado client-side, OK hasta ~500 registros por página
- Emails sin diseño Harvi (UX4 pendiente)
