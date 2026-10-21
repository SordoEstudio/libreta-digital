# QA — Nuevas funcionalidades (Octubre 2026)

**Alcance:** Dimensiones por materia · Notas por dimensión (multi-columna) · Peso opcional (promedio directo) · Plantillas de dimensiones · Recuperatorios por dimensión · Notas de referencia (con dimensiones y período) · Cuaderno del docente · Cierre de período · Comunicados con confirmación · Cuaderno v2 (edición inline de proceso, acciones por columna) · Unidades por materia · Cuaderno v3 (gradebook unificado: libreta inline, recuperatorios, smart defaults, drill-down) · Módulo de contenidos (docente editor + responsable viewer) · Boletín unificado + mobile (Compartir/Guardar PDF) · Mobile UX (header, bottom bar por rol, orientation guard) · Home responsable rediseñado · Boletín acuse de recibo digital  
**Roles necesarios:** superadmin, admin, docente, responsable (con email real para probar envíos)  
**Entorno:** staging o local con Supabase + Resend en modo test

---

## Setup previo

- Institución de prueba con slug conocido (ej. `demo`)
- Al menos 1 año lectivo activo con 2 períodos
- 1 curso con 3+ alumnos, cada uno con un responsable con email válido
- 1 docente asignado a al menos 1 materia del curso
- Admin y docente con cuentas activas

---

## 1. Dimensiones por materia

**Ruta:** `Configuración → Cursos → [curso] → click ✏️ en materia (sheet unificado)`

> Las dimensiones se gestionan ahora dentro del sheet de edición de materia. No hay botón separado de "Dimensiones" en la tarjeta.

### 1.0 Edición unificada de materia
- [x] Admin abre curso → tarjeta de materia muestra badges de dimensiones apilados (uno por línea)
- [x] Click ✏️ en tarjeta → sheet abre con sección "Dimensiones" al pie
- [x] **Esperado:** no hay botón "Dimensiones" separado en la tarjeta (eliminado)
- [x] Dimensiones existentes aparecen en lista dentro del sheet
- [x] Dimensiones en la tarjeta muestran nombre, sin peso

### 1.1 Crear dimensiones
- [x] Admin abre sheet de materia → sección Dimensiones → campo "Nueva dimensión"
- [x] Escribir "Trabajo en clase" → Enter o click "Agregar"
- [x] Escribir "Examen" → Enter
- **Esperado:** ambas aparecen en lista dentro del sheet

### 1.2 Peso opcional — promedio directo
- [ ] Crear dimensión sin ingresar peso → campo queda vacío, se guarda como "Promedio directo"
- [ ] **Esperado:** dimensión muestra "Promedio directo" en lugar de porcentaje
- [ ] Mezclar: una dimensión con peso 60, otra sin peso → ambas se guardan
- [ ] Crear dimensión con peso 0 → se almacena como "Promedio directo" (0 = null internamente)
- [ ] Libreta del alumno muestra "Promedio directo" para dimensiones sin peso

### 1.3 Validaciones
- [x] Intentar crear dimensión con nombre vacío → error
- [x] Intentar crear dimensión con peso negativo → error

### 1.4 Editar y eliminar
- [x] Editar nombre de dimensión → cambio persiste
- [x] Eliminar dimensión → desaparece de la lista
- [x] Verificar que evaluaciones vinculadas a esa dimensión no se rompen

### 1.5 Asignar evaluación a dimensiones (multi-select)
- [x] Ir a Evaluaciones de la materia → crear nueva evaluación
- [x] Si la materia tiene dimensiones, aparece sección "Dimensiones (opcional)" con checkboxes
- [x] Seleccionar 2 dimensiones → guardar
- [x] **Esperado:** evaluación aparece en la lista; al cargar notas, tabla tiene una columna por dimensión
- [x] Editar evaluación → checkboxes muestran las dimensiones asignadas → desmarcar una → guardar
- [x] **Esperado:** columna de esa dimensión desaparece en el editor de notas

### 1.6 Cargar notas por dimensión
- [x] Abrir editor de notas de evaluación con 2 dimensiones asignadas (ej. Oral, Escrito)
- [x] **Esperado:** tabla tiene columnas Alumno · Oral · Escrito · Ausente
- [x] Ingresar nota 8 para Oral y 5 para Escrito en alumno García
- [x] Guardar → recargar
- [x] **Esperado:** notas persisten en las columnas correctas
- [x] Marcar alumno como Ausente → ambas columnas se vacían y deshabilitan
- [x] Guardar → **Esperado:** alumno queda con "A" en ambas dimensiones
- [x] Abrir libreta del alumno → nota de Escrito bajo dimensión "Escrito", nota de Oral bajo "Oral"

### 1.7 Evaluación sin dimensiones asignadas
- [x] Evaluación sin dimensiones → editor muestra columna única "Nota" (comportamiento previo)
- [x] Sin regresión respecto a evaluaciones ya existentes

---

## 2. Plantillas de dimensiones

**Ruta:** `Configuración → Dim. plantillas` (sidebar, solo admin)

### 2.1 Crear plantilla
- [x] Admin abre "Dim. plantillas" en sidebar
- [x] Click "Nueva plantilla" → sheet lateral abre
- [x] Nombre: "Oral + Escrito", agregar ítems: "Oral" peso 30, "Escrito" peso 70
- [x] Guardar
- [x] **Esperado:** plantilla aparece en lista con "2 dimensiones: Oral (30%), Escrito (70%)"

### 2.2 Plantilla con promedio directo
- [x] Crear plantilla "Promedio directo" con ítems sin peso
- [x] **Esperado:** plantilla guardada, ítems muestran nombre sin porcentaje

### 2.3 Validaciones de creación
- [x] Intentar guardar con nombre vacío → botón deshabilitado
- [x] Intentar guardar sin ítems → botón deshabilitado
- [x] Ítem con nombre vacío → botón deshabilitado

### 2.4 Eliminar plantilla
- [x] Click ícono eliminar en plantilla → confirmación → plantilla desaparece
- [x] **Esperado:** toast confirmación. Materias donde ya se aplicó **no** cambian.

### 2.5 Aplicar plantilla a una materia
- [x] Ir a Configuración → Materias → [materia con dimensiones existentes]
- [x] Abrir sheet "Dimensiones"
- [x] Al fondo del sheet: sección "Aplicar plantilla" con select visible (si hay plantillas)
- [x] Seleccionar plantilla → click "Aplicar" → AlertDialog de confirmación
- [x] Confirmar
- [x] **Esperado:** dimensiones reemplazadas por los ítems de la plantilla, toast éxito

### 2.6 Aplicar plantilla reemplaza dimensiones existentes
- [x] Materia con dimensiones A, B, C → aplicar plantilla con ítems X, Y
- [x] **Esperado:** dimensiones A, B, C eliminadas; X e Y presentes

### 2.7 Aplicar plantilla a toda la institución (bulk)
- [x] Ir a `Configuración → Dim. plantillas`
- [x] Cada plantilla tiene botón "Aplicar a todas las materias"
- [x] Click → AlertDialog confirma: "dimensiones de todas las materias serán reemplazadas"
- [x] Confirmar
- [x] **Esperado:** toast "Plantilla aplicada a N materia(s)", todas las materias de todos los cursos con nuevas dimensiones

### 2.8 Sin plantillas creadas
- [x] Institución sin ninguna plantilla → no hay botones de aplicar
- [x] Sheet de dimensiones de materia → sección "Aplicar plantilla" **no aparece**

### 2.9 Aislamiento multi-tenant
- [x] Admin de institución A no puede aplicar plantillas de institución B
- [x] Intentar `POST /api/v1/materias/[id_B]/dimensiones/aplicar-plantilla` con `plantilla_id` de institución A → 404

---

## 3. Recuperatorios

**Ruta:** `Materias → [materia] → Evaluaciones` y editor de notas

### 3.1 Habilitar recuperatorio en evaluación
- [x] Crear evaluación con "Permite recuperatorio" activado
- [x] **Esperado:** en el editor de notas de esa evaluación aparece sección de recuperatorio al pie

### 3.2 Generar recuperatorio — requiere desaprobados
- [x] Cargar notas donde todos aprueban (todos ≥ nota_aprobacion) → botón "Generar recuperatorio" aparece **deshabilitado**
- [x] Modificar una nota por debajo del umbral → botón se habilita
- [x] Click → recuperatorio creado
- [x] **Esperado:** nueva evaluación "[nombre] — Recuperatorio" aparece en lista, badge "Recuperatorio"
- [x] Intentar generar nuevamente → error "Ya existe un recuperatorio"

### 3.3 Recuperatorio hereda dimensiones
- [x] Evaluación original tiene dimensiones asignadas (ej. Oral, Escrito)
- [x] Generar recuperatorio
- [x] Abrir editor de notas del recuperatorio
- [x] **Esperado:** tabla tiene columnas Oral y Escrito (mismas dimensiones que el original)

### 3.4 Filtro de alumnos elegibles
- [x] Evaluación con 4 alumnos: 2 aprobaron, 2 desaprobaron
- [x] Generar recuperatorio → abrir editor
- [x] **Esperado:** solo aparecen los 2 alumnos desaprobados
- [x] Los 2 aprobados **no aparecen** en el recuperatorio

### 3.5 Bloqueo por dimensión
- [x] Evaluación con dims Oral y Escrito. Alumno aprobó Oral (8) pero reprobó Escrito (3)
- [x] En recuperatorio → alumno aparece
- [x] Columna Oral: muestra "✓ Aprobado" (bloqueada, no editable)
- [x] Columna Escrito: input habilitado para cargar nota

### 3.6 Alumno ausente en original
- [x] Alumno marcado como ausente en la evaluación original
- [x] **Esperado:** aparece en el recuperatorio (ausente = desaprobado)

### 3.7 Restricciones
- [x] Evaluación sin "permite_recuperatorio" → botón no aparece
- [x] No se puede crear recuperatorio de un recuperatorio

---

## 4. Notas de referencia

**Ruta:** `Materias → [materia] → Referencia`

> Notas internas del docente. **No aparecen en la libreta del alumno.**

### 4.1 Crear evaluación de referencia
- [ ] Docente abre materia → sección Referencia → "Nueva evaluación"
- [ ] Crear tipo "Numérica", nombre "Diagnóstico inicial"
- [ ] Crear tipo "Conceptual", nombre "Participación"
- [ ] **Esperado:** ambas aparecen en la lista con su tipo

### 4.2 Cargar notas
- [ ] Abrir evaluación numérica → editor de notas
- [ ] Ingresar notas para todos los alumnos (7, 8.5, 10, vacío para uno)
- [ ] Guardar
- [ ] **Esperado:** notas guardadas, promedio del grupo calculado (solo alumnos con nota)
- [ ] Ingresar texto en campo numérico (ej. "abc") → no falla, se ignora o muestra error

### 4.3 Promedio
- [ ] Con notas 7, 8 y 9 → promedio = 8.00
- [ ] Con solo 1 nota → promedio = esa nota
- [ ] Sin notas → promedio no muestra NaN (muestra "—" o vacío)

### 4.4 Editar notas
- [ ] Modificar nota existente → valor actualizado al guardar
- [ ] Borrar nota (dejar vacío) → nota eliminada

### 4.5 Eliminar evaluación de referencia
- [ ] Botón eliminar en la lista → confirmación → evaluación desaparece
- [ ] **Verificar:** notas asociadas también eliminadas (no quedan huérfanas en DB)

### 4.6 Aislamiento por rol
- [ ] Responsable abre libreta del alumno → sección Referencia **no aparece**
- [ ] Responsable intenta `GET /api/v1/materias/[id]/evaluaciones-referencia` → 403

---

## 5. Cierre de período

**Ruta:** `Configuración → Años y cursos → [año] → Períodos → [período]`

### 5.1 Vista previa del cierre
- [ ] Admin abre período activo → botón "Cerrar período"
- [ ] **Esperado:** modal de preview con lista de materias y alumnos sin nota (vacíos)
- [ ] Preview muestra cuántas notas faltan

### 5.2 Cerrar período
- [ ] Confirmar cierre
- [ ] **Esperado:** período queda marcado "Cerrado", badge visible
- [ ] Período cerrado → formulario de notas en todas las materias queda bloqueado (no editable)
- [ ] Banner de "período cerrado" visible en pantalla de notas

### 5.3 Notificar responsables
- [ ] Botón "Notificar responsables" en período cerrado
- [ ] **Esperado:** emails enviados, toast de confirmación con cantidad
- [ ] Responsable recibe email con link a boletín

### 5.4 Reabrir período
- [ ] Admin: botón "Reabrir período" → confirmación → período vuelve a activo
- [ ] **Esperado:** notas vuelven a ser editables

### 5.5 Restricciones
- [ ] Docente intenta cerrar período → opción no disponible (solo admin)

---

## 6. Comunicados con confirmación de lectura

**Ruta:** `Comunicados` (sidebar, visible para admin y docente)

### 6.1 Ver lista
- [ ] Admin y docente ven "Comunicados" en sidebar
- [ ] Responsable **no ve** "Comunicados" en sidebar
- [ ] Lista vacía muestra icono + "Aún no hay comunicados."

### 6.2 Crear comunicado
- [ ] Click "Nuevo comunicado" → sheet lateral abre
- [ ] Completar: Título "Reunión de padres", Curso (seleccionar del dropdown), Contenido
- [ ] Enviar
- [ ] **Esperado:**
  - Toast con "Comunicado enviado (N destinatarios)"
  - Comunicado aparece en la lista con columna Confirmaciones "0/N"
  - Responsables del curso reciben email

### 6.3 Email recibido por responsable
- [ ] Responsable recibe email con asunto `"[Título] — [Institución]"`
- [ ] Email contiene: título, contenido, botón "Confirmar lectura"
- [ ] Botón apunta a `https://[app]/confirmar/[uuid]`

### 6.4 Confirmación pública (sin login)
- [ ] Abrir link de confirmación en navegador sin sesión activa
- [ ] **Esperado:** página simple con nombre de institución, título del comunicado, mensaje "Gracias por confirmar la lectura."
- [ ] Actualizar lista en dashboard → contador pasa de 0/N a 1/N

### 6.5 Confirmación idempotente
- [ ] Click "Confirmar lectura" segunda vez (mismo link) → página muestra "Ya confirmaste este comunicado."
- [ ] Contador en dashboard no cambia

### 6.6 Token inválido
- [ ] Abrir `/confirmar/00000000-0000-0000-0000-000000000000` (UUID inexistente)
- [ ] **Esperado:** "El enlace no es válido o ya expiró." — sin revelar si existe o no

### 6.7 Vista detalle del comunicado
- [ ] Click en título del comunicado en la lista → página de detalle
- [ ] **Esperado:**
  - Título, contenido, curso, fecha, autor visible
  - Badge "N/M confirmaron"
  - Tabla con email de cada destinatario y fecha de confirmación o badge "Pendiente"

### 6.8 Deduplicación de responsables
- [ ] Alumno A y Alumno B del mismo curso tienen el mismo responsable
- [ ] Crear comunicado para ese curso
- [ ] **Esperado:** responsable recibe 1 solo email, contador = 1 (no 2)

### 6.9 Curso sin responsables con email
- [ ] Crear comunicado para curso sin responsables registrados (o sin email)
- [ ] **Esperado:** toast "Comunicado enviado (0 destinatarios)", sin error, comunicado creado

### 6.10 Aislamiento multi-tenant
- [ ] Admin de institución A no ve comunicados de institución B
- [ ] Intentar `GET /api/v1/comunicados?institucion_id=[id_de_B]` siendo admin de A → 403

---

## 7. Notas de referencia — dimensiones y período

**Ruta:** `Materias → [materia] → Referencia`

> Extiende la sección 4. Verifica las nuevas capacidades: período y dimensiones en eval-refs.

### 7.1 Crear eval-ref con período
- [ ] Docente abre Referencia → "Nueva evaluación"
- [ ] Completar nombre "TP Diagnóstico", tipo "Numérica"
- [ ] Seleccionar período en el dropdown "Período" (debe listar los períodos del año lectivo del curso)
- [ ] Guardar
- [ ] **Esperado:** eval-ref aparece en tabla con columna Período correcta

### 7.2 Crear eval-ref con dimensiones
- [ ] Nueva evaluación de referencia
- [ ] Con la materia teniendo dimensiones (ej. Oral, Escrito), aparece sección con chips de dimensiones
- [ ] Seleccionar "Oral" y "Escrito" (chips se activan con borde primario)
- [ ] Guardar
- [ ] **Esperado:** eval-ref guardada. Abrir editor de notas → tabla con columnas Alumno · Oral · Escrito

### 7.3 Cargar notas multi-dim en referencia
- [ ] Abrir editor de eval-ref con dims Oral y Escrito
- [ ] Ingresar nota 8 en Oral y 6 en Escrito para alumno García
- [ ] Guardar
- [ ] Recargar → **Esperado:** notas persisten en las columnas correctas
- [ ] Promedio del grupo se calcula solo con valores numéricos válidos

### 7.4 Editar eval-ref existente
- [ ] En lista de Referencia → click ícono ✏️ de una eval-ref
- [ ] **Esperado:** sheet de edición abre con valores precargados (nombre, tipo, fecha, período, dims)
- [ ] Cambiar nombre, cambiar período, desmarcar una dimensión → Guardar
- [ ] **Esperado:** cambios reflejados en la tabla; en editor de notas, la columna de la dimensión desmarcada desaparece

### 7.5 Eval-ref sin dimensiones (caso legacy / materia sin dims)
- [ ] Materia sin dimensiones configuradas → nueva eval-ref no muestra selector de dims
- [ ] Editor de notas → columna única "Nota" + "Observación" (comportamiento previo sin regresión)

### 7.6 Eval-ref sin período seleccionado
- [ ] Crear eval-ref sin seleccionar período → se guarda con período "—"
- [ ] **Esperado:** columna Período muestra "—" (no error)

### 7.7 Aislamiento por institución
- [ ] Eval-refs de materia de institución A no accesibles desde institución B

---

## 8. Cuaderno del docente

**Ruta:** `Cuaderno` (sidebar, visible para admin y docente)

> Vista unificada: seguimiento (eval-refs del período) + promedio automático + nota definitiva editable.

### 8.1 Acceso desde sidebar
- [ ] Admin y docente ven "Cuaderno" en sidebar (grupo Institución)
- [ ] Responsable **no ve** "Cuaderno" en sidebar
- [ ] Click → página `/dashboard/[slug]/cuaderno`

### 8.2 Selección de materia y período
- [ ] Sin materia seleccionada → icono + "Seleccioná una materia para comenzar."
- [ ] Dropdown "Materia" lista todas las materias accesibles (admin: todas; docente: solo sus asignadas)
- [ ] Seleccionar materia sin período → dropdown "Período" aparece; si el curso no tiene períodos: "Esta materia no tiene períodos configurados."
- [ ] Seleccionar materia + período → tabla carga

### 8.3 Tabla de proceso (eval-refs)
- [ ] Con eval-refs de referencia para esa materia y período, columnas aparecen
- [ ] Eval-ref con dimensiones → sub-columnas (una por dimensión, nombre abajo del nombre de eval)
- [ ] Eval-ref sin dimensiones → columna simple
- [ ] Notas cargadas previamente aparecen como texto (solo lectura) — "—" si vacía
- [ ] Sin eval-refs en ese período → tabla aparece sin columnas de proceso

### 8.4 Columna Promedio
- [ ] Con al menos una eval-ref numérica → columna "Prom." aparece al final de las columnas de proceso
- [ ] Promedio calcula correctamente: todas las notas numéricas del alumno / cantidad
- [ ] Alumno sin ninguna nota → "—"
- [ ] Solo eval-refs conceptuales → columna Prom. no aparece

### 8.5 Columna Nota definitiva
- [ ] Columna "Nota definitiva" aparece con inputs editables (fondo ámbar suave)
- [ ] Si ya hay una nota definitiva del período cargada → valor precargado en input
- [ ] Si no hay nota definitiva → input vacío
- [ ] Ingresar valores (ej. 8, 9, 7) → click "Guardar nota definitiva"
- [ ] **Primera vez (sin eval definitiva creada):** se crea evaluación `es_definitiva_periodo=true` y luego se guardan las notas — toast "Notas definitivas guardadas"
- [ ] Recargar página → valores persisten en inputs
- [ ] **Segunda vez (eval ya existe):** notas se actualizan directamente sin crear nueva eval — toast igual

### 8.6 Toggle chips
- [ ] Chip "Proceso (N)" activo por defecto → click → columnas de eval-refs se ocultan
- [ ] Chip "Nota definitiva" activo por defecto → click → columna definitiva y botón guardar se ocultan
- [ ] Re-activar chips → columnas reaparecen
- [ ] Con ambos ocultos → tabla muestra solo columna Alumno

### 8.7 Alumnos ordenados
- [ ] Alumnos aparecen ordenados por apellido, luego nombre (A→Z)
- [ ] Filas alternas con fondo levemente diferente

### 8.8 Sin alumnos inscriptos
- [ ] Curso sin alumnos → mensaje "Sin alumnos inscriptos en este curso."

### 8.9 URL shareable
- [ ] Navegar a `/dashboard/[slug]/cuaderno?materia_id=[id]&periodo_id=[id]` directamente
- [ ] **Esperado:** página carga con selects en estado correcto y tabla visible

### 8.10 Restricción de acceso (docente)
- [ ] Docente sin materias asignadas → "No tenés materias asignadas."
- [ ] Docente con materias asignadas → solo ve sus materias en el selector
- [ ] Dropdown Materia no lista materias de otros docentes

---

## 9. Cuaderno v2 — edición inline y acciones por columna

**Ruta:** `Cuaderno` → seleccionar materia + período

> Extiende §8. Verifica las nuevas capacidades: edición inline de notas de proceso, botón guardar seguimiento, acciones por columna (editar/eliminar eval-ref desde el cuaderno), y botón crear nueva eval-ref desde el cuaderno.

### 9.1 Edición inline de notas de proceso
- [ ] Con eval-refs cargados para el período seleccionado → celdas de proceso son inputs editables (no texto estático)
- [ ] Click en celda vacía → input activo, se puede escribir un número
- [ ] Click en celda con nota existente → valor precargado en el input
- [ ] Modificar valor → cambio visible en el input antes de guardar
- [ ] **Esperado antes de guardar:** sin spinner, sin petición al servidor

### 9.2 Botón "Guardar seguimiento"
- [ ] Botón "Guardar seguimiento" visible en la parte inferior de la tabla (cuando hay eval-refs con proceso visible)
- [ ] Ingresar notas en varias celdas de distintos alumnos y eval-refs → click "Guardar seguimiento"
- [ ] **Esperado:** toast con resultado (ej. "Seguimiento guardado" o "N errores al guardar")
- [ ] Recargar página → valores ingresados persisten en los inputs
- [ ] **Guardar con filtro de unidad activo:** botón guarda todas las eval-refs del período (no solo las visibles por el filtro) — sin pérdida de datos

### 9.3 Acciones por columna — editar eval-ref
- [ ] Cada columna de eval-ref en el header muestra ícono ✏️ (al hover o siempre)
- [ ] Click ✏️ → sheet de edición de eval-ref abre con datos precargados (nombre, tipo, período, dimensiones, unidades)
- [ ] Cambiar nombre de la eval-ref → guardar
- [ ] **Esperado:** columna renombrada en el cuaderno, toast confirmación
- [ ] Sheet cierra y la tabla se actualiza automáticamente (router.refresh)

### 9.4 Acciones por columna — eliminar eval-ref
- [ ] Ícono de eliminar en header de columna → AlertDialog de confirmación
- [ ] Mensaje incluye aviso: "Se eliminarán también las notas cargadas para esta evaluación."
- [ ] Confirmar → eval-ref eliminada
- [ ] **Esperado:** columna desaparece de la tabla, toast confirmación
- [ ] Cancelar → no se elimina nada

### 9.5 Crear nueva eval-ref desde el cuaderno
- [ ] Botón "Nueva evaluación" (o ícono +) visible en el header del cuaderno
- [ ] Click → sheet de creación de eval-ref abre
- [ ] Completar nombre, tipo, período, dimensiones (opcional), unidades (opcional)
- [ ] Guardar → nueva columna aparece en el cuaderno
- [ ] **Esperado:** la nueva eval-ref queda en la misma materia y es visible de inmediato (router.refresh)

---

## 10. Unidades por materia

> Las unidades son agrupaciones de eval-refs dentro de una materia. Se pueden gestionar desde el cuaderno o desde el sheet de edición de materia, asignar al crear/editar eval-refs, y usar como filtro en la tabla del cuaderno.

### 10.1 Gestionar unidades desde el cuaderno (sheet)
- [ ] En página del cuaderno con materia seleccionada → botón/ícono "Gestionar unidades" (ícono de capas) visible en el header
- [ ] Click → sheet lateral "Gestionar unidades" abre
- [ ] Sheet muestra lista de unidades existentes para la materia (vacía si ninguna)
- [ ] Campo "Nueva unidad" + botón "Agregar"
- [ ] Escribir "Unidad 1: Introducción" → click "Agregar"
- [ ] **Esperado:** unidad aparece en la lista dentro del sheet, sin recargar la página completa
- [ ] Agregar segunda unidad "Unidad 2: Desarrollo"
- [ ] **Esperado:** ambas unidades en la lista

### 10.2 Eliminar unidad desde el sheet del cuaderno
- [ ] Click ícono eliminar junto a una unidad → AlertDialog de confirmación
- [ ] Mensaje: "Se quitará la unidad de todas las evaluaciones asignadas."
- [ ] Confirmar → unidad desaparece de la lista, toast confirmación
- [ ] Verificar: las eval-refs que tenían esa unidad asignada ya no la muestran

### 10.3 Gestionar unidades desde editar-materia-sheet
- [ ] Admin abre `Configuración → Cursos → [curso] → ✏️ en materia`
- [ ] Sheet de edición muestra sección "Unidades" (bajo Dimensiones)
- [ ] Agregar "Unidad 3: Cierre" → aparece en la lista
- [ ] Eliminar unidad → AlertDialog mismo mensaje → confirmar → unidad desaparece
- [ ] Guardar nombre/docente de la materia → unidades **no se pierden** (operaciones independientes)

### 10.4 Asignar unidades al crear eval-ref
- [ ] Con la materia teniendo unidades → abrir "Nueva evaluación" (desde cuaderno o desde Referencia)
- [ ] Sheet muestra sección "Unidades" con chips por cada unidad de la materia
- [ ] Click en chip → chip activa (borde primario)
- [ ] Seleccionar 1 o más unidades → guardar
- [ ] **Esperado:** eval-ref creada. En el cuaderno, la eval-ref queda asociada a esas unidades
- [ ] Eval-ref sin unidad seleccionada → se guarda sin unidad asignada (válido)

### 10.5 Asignar/cambiar unidades al editar eval-ref
- [ ] Abrir sheet ✏️ de una eval-ref existente (desde cuaderno o desde Referencia)
- [ ] Sección "Unidades" muestra chips; unidades ya asignadas están activas
- [ ] Desmarcar unidad asignada → guardar → unidad quitada de la eval-ref
- [ ] Marcar nueva unidad → guardar → eval-ref ahora tiene la unidad
- [ ] Cambio reflejado en el filtro del cuaderno

### 10.6 Filtro por unidad en el cuaderno
- [ ] Con 2+ unidades creadas y eval-refs asignadas a distintas unidades → chips de filtro aparecen sobre la tabla
- [ ] Chips: "Todas" (activo por defecto) + una por cada unidad + "Sin unidad" al final
- [ ] Click en chip de unidad → tabla muestra solo columnas de eval-refs asignadas a esa unidad
- [ ] Click "Sin unidad" → tabla muestra solo eval-refs sin ninguna unidad asignada
- [ ] Click "Todas" → tabla vuelve a mostrar todas las columnas
- [ ] Sin unidades creadas para la materia → chips de filtro **no aparecen**
- [ ] Todas las eval-refs tienen unidad asignada → chip "Sin unidad" aparece pero al seleccionarlo la tabla queda sin columnas de proceso (comportamiento correcto)

### 10.7 Filtro no afecta el guardado
- [ ] Activar filtro "Unidad 1" (oculta columnas de Unidad 2)
- [ ] Modificar notas visibles → "Guardar seguimiento"
- [ ] **Esperado:** notas de Unidad 2 (ocultas) **no se pierden** — botón guarda todo el período

### 10.8 Aislamiento multi-tenant — unidades
- [ ] Admin de institución A no puede ver/crear unidades de institución B
- [ ] `POST /api/v1/materias/[id_de_B]/unidades` desde sesión de institución A → 403 o 404
- [ ] `DELETE /api/v1/unidades/[id_de_B]` desde sesión de institución A → 403 o 404

---

## 11. Cuaderno v3 — Gradebook unificado

**Ruta:** `Cuaderno`  
**Prerequisito:** materia con al menos 1 evaluación de libreta (`es_definitiva_periodo = false`, `recuperatorio_de_evaluacion_id = null`) en el período activo; al menos 1 alumno inscripto.

### 11.1 Smart defaults al entrar sin params
- [ ] Navegar a `/dashboard/[slug]/cuaderno` sin parámetros en la URL
- [ ] **Esperado:** selector materia muestra primera materia de la lista; selector período muestra el período activo (o primero si ninguno activo)
- [ ] Tabla carga inmediatamente con esa selección (sin pantalla en blanco)
- [ ] Si hay solo una materia y un período → tabla muestra datos sin que el docente seleccione nada

### 11.2 Columnas Libreta inline editables
- [ ] Con evaluaciones de libreta en el período → aparece grupo "Libreta" con columnas azuladas
- [ ] Cada columna muestra el nombre de la evaluación; con dimensiones muestra sub-etiqueta de dimensión
- [ ] Celda vacía muestra "—" como placeholder
- [ ] Click en celda → Input editable; escribir nota numérica (ej. `8`)
- [ ] Escribir `A` o `a` → celda acepta el valor (ausente)
- [ ] Chip "Libreta (N)" visible en fila de chips; toggle → columnas libreta desaparecen/reaparecen

### 11.3 Guardar notas libreta
- [ ] Ingresar notas en columnas Libreta → click "Guardar todo"
- [ ] Toast "Notas guardadas" aparece
- [ ] Recargar página → notas persisten en las celdas
- [ ] Nota `A` (ausente): recargar → celda muestra `A`
- [ ] Nota `0` (cero): recargar → celda muestra `0` (no se pierde)
- [ ] Celda vacía no enviada → nota existente no se borra al guardar (blank = no-op)

### 11.4 Guardar unificado Libreta + Referencia
- [ ] Ingresar nota en columna Libreta Y modificar nota en columna Referencia → "Guardar todo"
- [ ] Toast único: "Notas guardadas" (no toast doble)
- [ ] Recargar → ambas notas persisten
- [ ] Si la API de libreta falla y la de referencia succeeds → toast con conteo de errores (ej. "1 error(es) al guardar")

### 11.5 Recuperatorios inline
- [ ] Evaluación con recuperatorio generado → columna "R" aparece adyacente a la columna del parcial (fondo azul más claro)
- [ ] Header "R" tiene tooltip con nombre completo del recuperatorio
- [ ] Celda R editable para alumno que reprobó (nota original < nota_aprobacion)
- [ ] **Dimensiones:** si evaluación tiene dims → columna R también tiene sub-cols por dimensión
- [ ] Dim aprobada (nota original >= nota_aprobacion) → celda R muestra "✓ 8" (no input, bloqueada)
- [ ] Dim no aprobada → celda R muestra input editable

### 11.6 Período cerrado
- [ ] Con período cerrado (`cerrado_at` no null) → columnas Libreta muestran inputs `disabled`
- [ ] Badge "(período cerrado)" visible en grupo Libreta del header
- [ ] Columnas Referencia **no** se deshabilitan por cierre de período
- [ ] "Guardar todo" aún funciona pero libreta retorna error 400 del endpoint (período cerrado)

### 11.7 Drill-down a editor completo
- [ ] Hover sobre header de columna Libreta → icono ExternalLink aparece (hover reveal)
- [ ] Click icono → navega a `/notas/[eval_id]?from=cuaderno&materia_id=X&periodo_id=Y`
- [ ] Página de notas muestra breadcrumb "← Cuaderno" en la parte superior
- [ ] Click "← Cuaderno" → vuelve al cuaderno con la misma materia y período seleccionados
- [ ] Navegar a `/notas/[eval_id]` directamente (sin `?from=cuaderno`) → **no** muestra breadcrumb
- [ ] Drill-down en columna "R" (recuperatorio) → también muestra breadcrumb al regresar

### 11.8 Chips y grupos visuales
- [ ] Chips visibles: "Libreta (N)", "Referencia (N)", "Nota definitiva"
- [ ] Fila de grupos en thead: "Libreta" (azul), "Referencia" (gris)
- [ ] Toggle "Libreta" → columnas libreta + R desaparecen; referencia y definitiva permanecen
- [ ] Toggle "Referencia" → columnas referencia desaparecen; libreta y definitiva permanecen
- [ ] Sin evaluaciones de libreta en el período → chip "Libreta" no aparece

### 11.9 Cambio de materia / período
- [ ] Cambiar selector de materia → tabla recarga con columnas de la nueva materia (notas correctas, no las de la anterior)
- [ ] Cambiar selector de período → tabla recarga con evaluaciones del nuevo período
- [ ] Inputs no muestran notas residuales de la selección anterior

### 11.10 Aislamiento multi-tenant — notas libreta
- [ ] `POST /api/v1/notas/bulk` con `evaluacion_id` de otra institución → 403 o 404
- [ ] Docente de institución A no puede ver columnas de libreta de institución B

---

---

## 12. Módulo de contenidos — Editor (docente / admin)

**Prerequisito:** institución con `modulo_contenidos = true`. Si no, activar desde Supabase o panel de superadmin.

**Ruta:** `Contenidos` (sidebar, visible para admin y docente cuando módulo activo)

### 12.1 Acceso y desambiguación
- [ ] Admin ve "Contenidos" en sidebar → click → `/dashboard/[slug]/contenidos`
- [ ] Docente con una sola materia → redirect directo a esa materia (sin pasar por selección de curso/materia)
- [ ] Docente con múltiples materias en mismo curso → página de materias con cards
- [ ] Docente con múltiples cursos → página de selección de curso
- [ ] Docente sin materias asignadas → EmptyState "Sin cursos disponibles"
- [ ] Admin ve todos los cursos del año lectivo activo

### 12.2 Crear unidad
- [ ] Entrar a materia → botón "Nueva unidad" visible
- [ ] Click → formulario inline o sheet abre con campos: Nombre (requerido, max 120), Descripción (opcional, max 500)
- [ ] Guardar → unidad aparece en lista expandida, badge "Borrador"
- [ ] Unidad nueva empieza como borrador (publicado = false)

### 12.3 Editar y publicar unidad
- [ ] Click ícono ✏️ en header de unidad → sheet con datos precargados → cambiar nombre → guardar → nombre actualizado
- [ ] Ícono Eye en header → PublicarOcultar toggle
- [ ] Publicar unidad borrador → badge "Borrador" desaparece
- [ ] Ocultar unidad publicada → AlertDialog de confirmación → confirmar → unidad vuelve a borrador

### 12.4 Agregar item — tipo link
- [ ] Expandir unidad → botón "+ Agregar material"
- [ ] Sheet abre con tabs: Link · Archivo · Imagen
- [ ] Tab Link: completar URL y título → guardar
- [ ] **Esperado:** item aparece en la unidad con ícono azul (link), botón "Abrir", texto del título visible
- [ ] Click "Abrir" → abre URL en nueva pestaña

### 12.5 Agregar item — tipo archivo
- [ ] Tab Archivo: seleccionar archivo PDF (o .docx, .xlsx) → completar título → guardar
- [ ] **Esperado:** item con ícono ámbar (archivo), botón "Descargar"
- [ ] Click "Descargar" → descarga o abre el archivo (redirige a signed URL)
- [ ] Archivo > 10 MB → error de validación (rechazado)
- [ ] Tipo no permitido (ej. `.exe`) → error de validación

### 12.6 Agregar item — tipo imagen
- [ ] Tab Imagen: seleccionar JPEG o PNG → título → guardar
- [ ] **Esperado:** item con ícono verde (imagen), botones "Ver" y "Descargar"
- [ ] "Ver" → abre imagen en nueva pestaña
- [ ] "Descargar" → descarga la imagen

### 12.7 Editar item
- [ ] Click ícono ✏️ de un item → sheet abre con datos precargados
- [ ] Cambiar título → guardar → título actualizado en la lista

### 12.8 Reordenar items
- [ ] Con 3+ items en una unidad → íconos ↑ ↓ en cada item
- [ ] Click ↑ en segundo item → sube al primer lugar (optimista, sin recargar)
- [ ] Click ↓ en primer item → baja al segundo lugar
- [ ] Primer item → ↑ deshabilitado; último item → ↓ deshabilitado

### 12.9 Eliminar item
- [ ] Ícono eliminar → confirmación → item desaparece
- [ ] Archivo en storage → eliminado (no quedan archivos huérfanos)

### 12.10 Borrador vs publicado
- [ ] Item borrador → badge "Borrador" visible
- [ ] Publicar item → badge desaparece
- [ ] Unidad borrador → responsable no puede acceder aunque URL sea directa

### 12.11 Nota y dimensión
- [ ] Al crear item: campo "Nota" opcional → guardar con nota → nota visible en itálica bajo el título
- [ ] Campo "Dimensión" (dropdown, si materia tiene dims) → badge visible en item
- [ ] Sin dimensiones en la materia → campo Dimensión no aparece

### 12.12 Permisos API
- [ ] `POST /api/v1/contenidos/unidades` como responsable → 403
- [ ] `PUT /api/v1/contenidos/items/[id]` como responsable → 403
- [ ] `DELETE /api/v1/contenidos/items/[id]` como responsable → 403
- [ ] Docente de institución A no puede editar contenidos de institución B

---

## 13. Módulo de contenidos — Vista responsable

**Prerequisito:** responsable con al menos un alumno inscripto en un curso con materias que tengan contenidos publicados.

**Ruta:** tab "Contenidos" en bottom bar (mobile) o sidebar

### 13.1 Filtrado por inscripciones
- [ ] Responsable A tiene alumno en Curso 1 → ve solo Curso 1 en `/contenidos`
- [ ] Responsable B tiene alumnos en Curso 1 y Curso 2 → ve ambos cursos
- [ ] Responsable sin alumnos inscriptos → EmptyState "Sin cursos disponibles"
- [ ] Responsable intenta acceder directamente a `/contenidos/[curso_id]` de un curso donde no tiene alumno → redirect a `/contenidos`

### 13.2 Desambiguación
- [ ] Responsable con 1 alumno en 1 curso con 1 materia → redirect directo a esa materia (sin intermedios)
- [ ] Responsable con 1 curso pero múltiples materias → página de selección de materia
- [ ] Responsable con múltiples cursos → página de selección de curso

### 13.3 Solo contenidos publicados
- [ ] Responsable abre materia → solo ve unidades con `publicado = true`
- [ ] Unidades en borrador → no aparecen (ni como placeholder)
- [ ] Items en borrador → no aparecen dentro de unidades publicadas

### 13.4 Read-only — sin controles de edición
- [ ] No hay botón "Nueva unidad"
- [ ] No hay íconos ✏️ ni Eye en headers de unidades
- [ ] No hay íconos de reordenar (↑ ↓) ni eliminar en items
- [ ] No hay botón "+ Agregar material"
- [ ] Badge "Borrador" no aparece (responsable nunca ve borradores)

### 13.5 Botones de acción
- [ ] Item tipo link → botón "Abrir" → abre URL en nueva pestaña ✓
- [ ] Item tipo archivo → botón "Descargar" → descarga archivo (requiere autenticación, usa signed URL)
- [ ] Item tipo imagen → botones "Ver" y "Descargar" → Ver abre imagen; Descargar descarga
- [ ] Sin signedUrl (error generando URL) → botones de archivo/imagen no aparecen (no 500)

### 13.6 Aislamiento multi-tenant
- [ ] Responsable de institución A no puede ver contenidos de institución B
- [ ] `GET /dashboard/[slug_B]/contenidos` como responsable de institución A → notFound o redirect

---

## 14. Boletín unificado

**Ruta:** `/dashboard/[slug]/libreta/[alumno_id]/boletin`

### 14.1 Tabla unificada por template y período
- [ ] Alumno con notas en múltiples períodos → tabla muestra TODOS los períodos como grupos de columnas en la fila de encabezado
- [ ] Fila 1 del encabezado: períodos como headers con `colspan` correcto
- [ ] Fila 2 del encabezado: nombre de cada template (evaluación institucional) bajo su período
- [ ] Columna "Definitiva" al final (solo si hay alguna nota definitiva_anual)
- [ ] Materia con dimensiones → una fila por dimensión, celda "Materia" tiene rowspan
- [ ] Materia sin dimensiones → fila única

### 14.2 Ausente en boletín
- [ ] Alumno con nota `valor_literal = 'A'` → celda muestra "Ausente" con texto naranja
- [ ] Alumno aprobado → celda muestra número en negrita

### 14.3 Asistencia
- [ ] Materia con inasistencias → texto "N inasistencia(s)" bajo nombre de materia (sub-texto pequeño)
- [ ] Sin inasistencias → sin texto adicional

### 14.4 Volver — navegación por rol
- [ ] Admin / docente: botón "Volver" → navega a `/alumnos`
- [ ] Responsable (solo responsable): botón "Volver" → navega a `/mis-alumnos`

### 14.5 Mobile — Compartir y Guardar
- [ ] En mobile (< md): dos botones visibles con texto: "Compartir" y "Guardar"
- [ ] "Compartir" → invoca Web Share API (`navigator.share`) con título del boletín y URL actual
  - Si el dispositivo no soporta `navigator.share` → botón no hace nada (no rompe)
- [ ] "Guardar" → invoca `window.print()` → abre diálogo nativo "Guardar como PDF"
- [ ] En desktop (≥ md): solo botón con ícono de impresora → `window.print()`
- [ ] En impresión / PDF: botones Compartir/Guardar/Imprimir ocultos (`print:hidden`)

### 14.6 Header del boletín
- [ ] Logo de institución visible en impresión (si `logo_rectangular_url` definido)
- [ ] Nombre alumno, curso y año lectivo en encabezado

---

## 15. Mobile UX

### 15.1 Header mobile (< md)
- [ ] Logo cuadrado de institución visible en header mobile (carga desde `/api/v1/instituciones/branding`)
- [ ] Sin logo: ícono fallback + nombre institución
- [ ] Campana de notificaciones → ícono compacto → dropdown en side="bottom" align="end"
- [ ] Dropdown notificaciones no desborda el ancho del viewport (max `calc(100vw - 2rem)`)
- [ ] Avatar → abre sheet inferior con nombre, email y botón "Cerrar sesión"
- [ ] Cerrar sesión → hace signOut → redirect a /login

### 15.2 Bottom tab bar — Admin / Superadmin
- [ ] Tabs: **Inicio** | **Comunicados** | **Alumnos** | **Más**
- [ ] "Inicio" activo solo en ruta exacta `/dashboard/[slug]`
- [ ] "Comunicados" activo en rutas que empiezan con `/comunicados`
- [ ] "Alumnos" activo en `/alumnos` y `/libreta` paths
- [ ] "Más" → abre sidebar
- [ ] Tab activo: color primary; inactivo: muted-foreground

### 15.3 Bottom tab bar — Docente
- [ ] Tabs: **Inicio** | **Cuaderno** | **Materias** | **Comunicados**
- [ ] Sin botón "Más"
- [ ] "Materias" activo en rutas `/cursos`

### 15.4 Bottom tab bar — Responsable
- [ ] Tabs: **Inicio** | **Contenidos** | **Comunicados** | **Boletines**
- [ ] Sin botón "Más"
- [ ] "Boletines" activo en `/mis-alumnos` y `/libreta` paths
- [ ] "Contenidos" activo en rutas `/contenidos`
- [ ] Tab bar no aparece fuera de rutas `/dashboard/[slug]`

### 15.5 Bottom bar — sticky / fijo
- [ ] Barra siempre visible en el borde inferior del viewport aunque el contenido sea largo
- [ ] Contenido principal scrollea por encima de la barra (no debajo)
- [ ] En iPhone con home indicator: barra respeta `env(safe-area-inset-bottom)` (no tapa el indicador)
- [ ] En desktop (≥ md): barra **no aparece**

### 15.6 MobileOrientationGuard — Cuaderno
- [ ] En mobile portrait: tabla del cuaderno aparece difuminada (blur)
- [ ] Overlay con ícono de rotar y texto "Girá el dispositivo"
- [ ] Rotar a landscape → overlay desaparece, tabla visible y usable
- [ ] En desktop → overlay nunca aparece

### 15.7 MobileOrientationGuard — Evaluaciones
- [ ] En mobile portrait: tabla de evaluaciones aparece difuminada
- [ ] Mismo overlay que en cuaderno
- [ ] Rotar a landscape → overlay desaparece

### 15.8 Textarea auto-grow — Nuevo comunicado
- [ ] Sheet "Nuevo comunicado" → campo Contenido empieza con altura de 1 línea
- [ ] Escribir texto largo → textarea crece automáticamente (sin scrollbar interno)
- [ ] Sin control de resize visible (no aparece el handle de redimensionar)
- [ ] Al borrar texto → textarea se reduce

### 15.9 Comunicados — vista mobile
- [ ] En mobile: lista de cards en lugar de tabla
- [ ] Cada card muestra: título, curso/materia, fecha, badge confirmaciones
- [ ] Card completa es tappable → navega al detalle del comunicado
- [ ] En desktop: tabla normal (sin cambio)

### 15.10 Mis alumnos / Boletines — mobile
- [ ] Grid de cards donde la card completa es un link al boletín del alumno
- [ ] Badge "Inactivo" solo si alumno no activo
- [ ] Sin CardFooter con botón separado (toda la card es el botón)

---

## 16. Home responsable — rediseño

**Ruta:** `/dashboard/[slug]` como responsable puro (sin rol admin ni docente)

### 16.1 Header de bienvenida
- [ ] Mensaje "Buen día, [primer nombre]" (o tarde/noche según hora local)
- [ ] Fecha de hoy formateada en español (ej. "miércoles 21 de octubre de 2026")
- [ ] Badge con nombre del año lectivo activo
- [ ] Sin sección "Últimas notas" (eliminada)

### 16.2 Tarjetas de alumnos
- [ ] Una card por alumno vinculado
- [ ] Avatar con iniciales del alumno (sin foto)
- [ ] Nombre completo y curso visible
- [ ] Botones CTA en la card: "Ver boletín" y otro acción disponible
- [ ] Click "Ver boletín" → navega a `/libreta/[alumno_id]`

### 16.3 Accesos rápidos
- [ ] Grilla 2 columnas con íconos grandes
- [ ] Ítems: Boletín, Comunicados, Contenidos (solo si `modulo_contenidos = true`), Ayuda
- [ ] Click en cada ítem → navega a la ruta correspondiente
- [ ] Sin módulo de contenidos: ítem "Contenidos" no aparece en la grilla

### 16.4 Banner de comunicados pendientes
- [ ] Si hay comunicados sin confirmar → banner visible encima de las cards
- [ ] Sin comunicados pendientes → banner no aparece

### 16.5 Aislamiento por rol
- [ ] Admin o docente en `/dashboard/[slug]` → ve el home de su rol (no este home)
- [ ] Responsable sin alumnos vinculados → home carga sin tarjetas (EmptyState o mensaje apropiado)

---

## 17. Boletín — acuse de recibo digital

**Prerequisito:** al menos 1 período cerrado (`cerrado_at IS NOT NULL`) en el año lectivo activo. Responsable con al menos 1 alumno vinculado.

### 17.1 Visibilidad: solo períodos cerrados

- [ ] Responsable abre boletín de un alumno → solo ve evaluaciones de períodos con `cerrado_at != null`
- [ ] Períodos activos (no cerrados) → **no aparecen** en el boletín del responsable
- [ ] Admin o docente → ven todos los períodos independientemente de si están cerrados

### 17.2 Pantalla de confirmación (gate)

- [ ] Responsable accede a `/libreta/[alumno_id]` con al menos 1 período cerrado sin acuse → redirect a `/confirmar`
- [ ] Pantalla muestra: nombre del alumno, nombre de la institución, lista de períodos pendientes con ícono CheckCircle
- [ ] Texto aclaratorio: "Al continuar confirmás haber recibido el boletín..."
- [ ] Nota al pie: "Esta confirmación queda registrada con fecha y hora. No se puede deshacer."

### 17.3 Confirmación batch

- [ ] Se publican Período 1 y Período 2 antes del primer acceso del responsable
- [ ] Responsable entra → pantalla de confirmación muestra **ambos períodos** en la lista
- [ ] Click "Confirmar y ver boletín" → un solo POST inserta acuses para los 2 períodos
- [ ] Redirect a `/boletin` después de confirmar
- [ ] Reentrar a `/libreta/[alumno_id]` → sin pantalla de confirmación (ya confirmados)

### 17.4 Nueva confirmación al publicar nuevo período

- [ ] Responsable ya confirmó Período 1 y Período 2
- [ ] Admin cierra Período 3
- [ ] Responsable entra a `/libreta/[alumno_id]` → pantalla de confirmación muestra **solo Período 3**
- [ ] Confirmar → acuse insertado solo para Período 3
- [ ] Reentrar → sin pantalla (todos confirmados)

### 17.5 Idempotencia

- [ ] Enviar misma confirmación dos veces (doble click o reintento) → sin error, sin duplicados en DB
- [ ] Boletín sigue siendo accesible (no se bloquea por conflicto)

### 17.6 Acceso directo a /boletin sin confirmar

- [ ] Responsable accede directo a `/libreta/[alumno_id]/boletin` sin pasar por gate
- [ ] **Esperado:** boletín carga pero solo muestra evaluaciones de períodos **cerrados** (filtro server-side)
- [ ] Si hay períodos sin confirmar → el contenido visible es el correcto (los cerrados), la confirmación es UX no security gate

### 17.7 Admin — página de acuses

- [ ] Admin accede a `/dashboard/[slug]/acuses` (link "Acuses" en sidebar sección Configuración)
- [ ] Dropdown de períodos → lista solo períodos cerrados del año activo
- [ ] Tabla: columnas Alumno · Curso (oculta en mobile) · Responsables · Estado
- [ ] Cada fila de responsable: ícono verde con fecha si confirmó, ícono gris si no
- [ ] Columna Estado: `2/2` verde si todos confirmaron, `0/2` rojo si ninguno, `1/2` ámbar si parcial
- [ ] Resumen debajo del título: "N/M familias confirmaron"
- [ ] Alumno sin responsables → columna Responsables muestra "Sin responsables", Estado "—"

### 17.8 Admin — filtro por período

- [ ] Cambiar período en el dropdown → tabla recarga con acuses del período seleccionado
- [ ] URL actualiza a `?periodo_id=[id]` (navegación preservable)
- [ ] Sin períodos cerrados → mensaje "No hay períodos cerrados para mostrar."

### 17.9 Restricción de acceso — acuses

- [ ] Docente intenta acceder a `/acuses` → redirect a `/dashboard/[slug]`
- [ ] Responsable intenta `POST /api/v1/boletin-acuses` con `alumno_id` de un alumno que no es el suyo → 400 o 403
- [ ] Responsable intenta confirmar período no cerrado → 400

---

## Regresiones a verificar

Después de QA de nuevas funcionalidades, verificar que lo siguiente sigue funcionando:

- [ ] Editar materia (sheet unificado) → dimensiones se mantienen, no se pierden al guardar nombre/docente
- [ ] Notas de referencia sin dimensiones siguen funcionando (sin regresión)
- [ ] Crear alumno, asignar responsable, enviar invitación → responsable puede hacer login
- [ ] Cargar notas en evaluación normal → aparece en libreta del alumno
- [ ] Cerrar período → notas bloqueadas → reabrir → notas desbloqueadas
- [ ] Boletín del alumno → Guardar PDF funciona (desktop: print dialog; mobile: diálogo nativo)
- [ ] Asistencia se puede cargar y aparece en libreta
- [ ] Cuaderno v1: chips Proceso/Nota definitiva siguen funcionando tras v2
- [ ] Cuaderno v2: guardar nota definitiva no afecta notas de proceso (columnas independientes)
- [ ] Eval-refs creadas desde Referencia siguen apareciendo en cuaderno (misma materia y período)
- [ ] Eliminar eval-ref desde cuaderno → también desaparece de la página Referencia
- [ ] Cuaderno v3: "Guardar todo" no borra notas de referencia (columnas separadas, endpoints distintos)
- [ ] Cuaderno v3: cambiar materia en selector no mezcla notas entre materias
- [ ] Página `/notas/[eval_id]` sin `?from=cuaderno` → sigue funcionando igual (sin breadcrumb, sin regresión)
- [ ] Sidebar desktop: Calendario **no aparece** (removido del menú)
- [ ] Sidebar desktop: Contenidos aparece solo si `modulo_contenidos = true` en la institución
- [ ] Login y redirect por rol: responsable llega a su página de inicio correcta
- [ ] Admin desde mobile: Inicio → dashboard con stats institucionales

---

## Bugs a reportar

Para cada bug encontrado:
- Pantalla / URL exacta
- Pasos para reproducir
- Comportamiento actual vs esperado
- Rol del usuario y nombre de la institución de prueba
