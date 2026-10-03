# QA — Libreta Digital

Última actualización: 2026-10-03 · Branch base: `master` (`3ed6a37`)

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

## QA completo desde cero

Script secuencial para probar el producto sobre una institución nueva. Cubre todos los roles y flujos críticos. Ejecutar en orden — cada paso depende del anterior.

### Preparación

- [ ] Tener acceso superadmin a la plataforma
- [ ] Tener 3 emails de prueba disponibles: `admin@`, `docente@`, `responsable@`
- [ ] Abrir la app en una pestaña privada para testear cada rol sin mezclar sesiones

---

### Paso 1 · Crear institución (superadmin)

1. [ ] Login como superadmin
2. [ ] Ir a `/dashboard/instituciones/nueva`
3. [ ] Completar nombre, slug único, tipo
4. [ ] Confirmar → institución aparece en lista de instituciones
5. [ ] Navegar a `/dashboard/[slug]` → muestra home admin (stats en 0, sin alertas, sin "Todo en orden")

---

### Paso 2 · Invitar primer admin

1. [ ] En `/dashboard/[slug]/usuarios` → "Nuevo usuario"
2. [ ] Completar nombre, email `admin@`, rol Admin
3. [ ] Confirmar → toast éxito + usuario aparece en tabla con estado Activo
4. [ ] Copiar link de invitación desde la UI
5. [ ] Abrir link en pestaña privada → pantalla de registro
6. [ ] Registrar con contraseña → login automático
7. [ ] Verificar: home muestra HomeAdmin (no HomeDocente ni HomeResponsable)
8. [ ] Verificar: sidebar muestra navegación de admin (Alumnos, Usuarios, Configuración, Materias)

---

### Paso 3 · Configurar año lectivo y períodos (admin)

1. [ ] Ir a `/dashboard/[slug]/configuracion`
2. [ ] Crear año lectivo (ej: "2026") → aparece en selector, badge "Inactivo"
3. [ ] Ir a gestionar períodos (ícono Settings) → crear 2 períodos (ej: "1° Cuatrimestre", "2° Cuatrimestre")
4. [ ] Volver a configuración → períodos visibles como badges
5. [ ] Activar año → badge cambia a "Activo"
6. [ ] Verificar: home admin muestra año en card "Cursos · 2026"

---

### Paso 4 · Crear cursos y materias (admin)

1. [ ] En configuración → crear curso (ej: "3° A")
2. [ ] Seleccionar curso → agregar materia (ej: "Matemática")
3. [ ] Agregar segunda materia (ej: "Historia")
4. [ ] Verificar: home admin muestra alerta "2 materias sin docente asignado"
5. [ ] Ir a catálogo de Materias → buscar "Matemática" → aparece con 1 instancia
6. [ ] Editar nombre desde catálogo → funciona
7. [ ] Intentar eliminar → opción oculta (tiene instancias)

---

### Paso 5 · Invitar docente (admin)

1. [ ] En Usuarios → "Nuevo usuario" → nombre, email `docente@`, rol Docente
2. [ ] Confirmar → aparece en tabla con badge "Docente"
3. [ ] Filtrar tabla por rol "Docente" → muestra solo el docente
4. [ ] Abrir link de invitación en nueva pestaña privada → registrar
5. [ ] Verificar: home muestra HomeDocente con mensaje "Sin materias asignadas"
6. [ ] Volver a sesión admin → asignar docente a "Matemática" desde configuración
7. [ ] En sesión docente → home muestra "Matemática — 3° A" sin evaluaciones

---

### Paso 6 · Crear alumno y asignar a curso (admin)

1. [ ] En Alumnos → "Nuevo alumno"
2. [ ] Completar nombre → confirmar → aparece en tabla
3. [ ] Filtrar por "Sin curso" → el alumno aparece
4. [ ] Verificar: home admin muestra alerta "1 alumno sin curso"
5. [ ] Desde acciones del alumno → asignar a "3° A"
6. [ ] Filtrar por "Sin curso" → tabla vacía
7. [ ] Verificar: home admin sin alertas → badge "Todo en orden"

---

### Paso 7 · Invitar responsable y vincular alumno (admin)

1. [ ] En Usuarios → "Nuevo usuario" → nombre, email `responsable@`, rol Responsable
2. [ ] En step 2 del formulario → seleccionar el alumno creado → confirmar
3. [ ] Verificar: alumno tiene chip de responsable en tabla
4. [ ] Abrir ResponsablesSheet del alumno → responsable aparece en lista
5. [ ] Editar relación (ej: "Madre") → guardar → aparece en chip
6. [ ] Agregar teléfono → guardar → visible en sheet
7. [ ] Vaciar teléfono → guardar → campo limpiado correctamente
8. [ ] Abrir link invitación responsable en nueva pestaña privada → registrar
9. [ ] Verificar: home muestra HomeResponsable → alumno con "Sin notas cargadas este año"
10. [ ] Verificar: link "Ver libreta" abre libreta del alumno

---

### Paso 8 · Cargar notas (docente)

1. [ ] En sesión docente → home → click "Cargar notas" en Matemática → navega a evaluaciones
2. [ ] Crear evaluación (ej: "Parcial 1", tipo Parcial, período 1° Cuatrimestre)
3. [ ] Abrir evaluación → cargar nota al alumno
4. [ ] Volver al home docente → "Parcial 1: Completo"
5. [ ] En sesión responsable → home muestra nota en Matemática
6. [ ] Ir a libreta → nota visible con valor correcto

---

### Paso 9 · Editar y desactivar usuario (admin)

1. [ ] En Usuarios → click ícono lápiz en docente
2. [ ] Cambiar nombre → guardar → tabla actualizada
3. [ ] Agregar DNI → guardar → visible en sheet si se reabre
4. [ ] Desactivar acceso → ConfirmDialog → confirmar → fila con opacity-60
5. [ ] Filtrar por "Inactivo" → docente aparece
6. [ ] Reactivar → sin ConfirmDialog → fila vuelve a opacity-100
7. [ ] Filtrar por "Activo" → docente aparece

---

### Paso 10 · Desvincular responsable (admin)

1. [ ] Abrir ResponsablesSheet del alumno
2. [ ] Click icono basura → ConfirmDialog con descripción clara
3. [ ] Cancelar → responsable sigue en lista
4. [ ] Confirmar → responsable desvinculado
5. [ ] En sesión responsable → home muestra "Sin alumnos asignados"

---

## Flujos críticos end-to-end

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
| `3d04719` | `home-admin`: alertas materias sin docente incluían historial de todos los años | Filtrado al año lectivo activo |
| `3d04719` | `EditarUsuarioSheet` / `ResponsablesSheet`: no se podían vaciar campos opcionales | Schema acepta `null`; frontend envía `null` para campos vacíos |
| `6b5db57` | `/materias/[id]/evaluaciones`: cualquier docente podía acceder a cualquier materia | Guard verifica que el docente esté asignado a esa materia específica |
| `6b5db57` | `/cursos/[id]`: docentes veían botón "Evaluaciones" en materias no asignadas | Muestra "No asignado" en lugar del botón para materias fuera de su asignación |

---

## Limitaciones conocidas (aceptables MVP)

- Sin paginación en tablas — filtrado client-side, OK hasta ~500 registros por página
- Emails sin diseño Harvi (UX4 pendiente)
