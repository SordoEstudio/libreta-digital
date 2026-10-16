# QA — Nuevas funcionalidades (Octubre 2026)

**Alcance:** Dimensiones por materia · Notas por dimensión (multi-columna) · Peso opcional (promedio directo) · Plantillas de dimensiones · Recuperatorios por dimensión · Notas de referencia (con dimensiones y período) · Cuaderno del docente · Cierre de período · Comunicados con confirmación  
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
- [ ] Admin abre curso → tarjeta de materia muestra badges de dimensiones apilados (uno por línea)
- [ ] Click ✏️ en tarjeta → sheet abre con sección "Dimensiones" al pie
- [ ] **Esperado:** no hay botón "Dimensiones" separado en la tarjeta (eliminado)
- [ ] Dimensiones existentes aparecen en lista dentro del sheet
- [ ] Dimensiones en la tarjeta muestran nombre, sin peso

### 1.1 Crear dimensiones
- [ ] Admin abre sheet de materia → sección Dimensiones → campo "Nueva dimensión"
- [ ] Escribir "Trabajo en clase" → Enter o click "Agregar"
- [ ] Escribir "Examen" → Enter
- **Esperado:** ambas aparecen en lista dentro del sheet

### 1.2 Peso opcional — promedio directo
- [ ] Crear dimensión sin ingresar peso → campo queda vacío, se guarda como "Promedio directo"
- [ ] **Esperado:** dimensión muestra "Promedio directo" en lugar de porcentaje
- [ ] Mezclar: una dimensión con peso 60, otra sin peso → ambas se guardan
- [ ] Crear dimensión con peso 0 → se almacena como "Promedio directo" (0 = null internamente)
- [ ] Libreta del alumno muestra "Promedio directo" para dimensiones sin peso

### 1.3 Validaciones
- [ ] Intentar crear dimensión con nombre vacío → error
- [ ] Intentar crear dimensión con peso negativo → error

### 1.4 Editar y eliminar
- [ ] Editar nombre de dimensión → cambio persiste
- [ ] Eliminar dimensión → desaparece de la lista
- [ ] Verificar que evaluaciones vinculadas a esa dimensión no se rompen

### 1.5 Asignar evaluación a dimensiones (multi-select)
- [ ] Ir a Evaluaciones de la materia → crear nueva evaluación
- [ ] Si la materia tiene dimensiones, aparece sección "Dimensiones (opcional)" con checkboxes
- [ ] Seleccionar 2 dimensiones → guardar
- [ ] **Esperado:** evaluación aparece en la lista; al cargar notas, tabla tiene una columna por dimensión
- [ ] Editar evaluación → checkboxes muestran las dimensiones asignadas → desmarcar una → guardar
- [ ] **Esperado:** columna de esa dimensión desaparece en el editor de notas

### 1.6 Cargar notas por dimensión
- [ ] Abrir editor de notas de evaluación con 2 dimensiones asignadas (ej. Oral, Escrito)
- [ ] **Esperado:** tabla tiene columnas Alumno · Oral · Escrito · Ausente
- [ ] Ingresar nota 8 para Oral y 5 para Escrito en alumno García
- [ ] Guardar → recargar
- [ ] **Esperado:** notas persisten en las columnas correctas
- [ ] Marcar alumno como Ausente → ambas columnas se vacían y deshabilitan
- [ ] Guardar → **Esperado:** alumno queda con "A" en ambas dimensiones
- [ ] Abrir libreta del alumno → nota de Escrito bajo dimensión "Escrito", nota de Oral bajo "Oral"

### 1.7 Evaluación sin dimensiones asignadas
- [ ] Evaluación sin dimensiones → editor muestra columna única "Nota" (comportamiento previo)
- [ ] Sin regresión respecto a evaluaciones ya existentes

---

## 2. Plantillas de dimensiones

**Ruta:** `Configuración → Dim. plantillas` (sidebar, solo admin)

### 2.1 Crear plantilla
- [ ] Admin abre "Dim. plantillas" en sidebar
- [ ] Click "Nueva plantilla" → sheet lateral abre
- [ ] Nombre: "Oral + Escrito", agregar ítems: "Oral" peso 30, "Escrito" peso 70
- [ ] Guardar
- [ ] **Esperado:** plantilla aparece en lista con "2 dimensiones: Oral (30%), Escrito (70%)"

### 2.2 Plantilla con promedio directo
- [ ] Crear plantilla "Promedio directo" con ítems sin peso
- [ ] **Esperado:** plantilla guardada, ítems muestran nombre sin porcentaje

### 2.3 Validaciones de creación
- [ ] Intentar guardar con nombre vacío → botón deshabilitado
- [ ] Intentar guardar sin ítems → botón deshabilitado
- [ ] Ítem con nombre vacío → botón deshabilitado

### 2.4 Eliminar plantilla
- [ ] Click ícono eliminar en plantilla → confirmación → plantilla desaparece
- [ ] **Esperado:** toast confirmación. Materias donde ya se aplicó **no** cambian.

### 2.5 Aplicar plantilla a una materia
- [ ] Ir a Configuración → Materias → [materia con dimensiones existentes]
- [ ] Abrir sheet "Dimensiones"
- [ ] Al fondo del sheet: sección "Aplicar plantilla" con select visible (si hay plantillas)
- [ ] Seleccionar plantilla → click "Aplicar" → AlertDialog de confirmación
- [ ] Confirmar
- [ ] **Esperado:** dimensiones reemplazadas por los ítems de la plantilla, toast éxito

### 2.6 Aplicar plantilla reemplaza dimensiones existentes
- [ ] Materia con dimensiones A, B, C → aplicar plantilla con ítems X, Y
- [ ] **Esperado:** dimensiones A, B, C eliminadas; X e Y presentes

### 2.7 Aplicar plantilla a toda la institución (bulk)
- [ ] Ir a `Configuración → Dim. plantillas`
- [ ] Cada plantilla tiene botón "Aplicar a todas las materias"
- [ ] Click → AlertDialog confirma: "dimensiones de todas las materias serán reemplazadas"
- [ ] Confirmar
- [ ] **Esperado:** toast "Plantilla aplicada a N materia(s)", todas las materias de todos los cursos con nuevas dimensiones

### 2.8 Sin plantillas creadas
- [ ] Institución sin ninguna plantilla → no hay botones de aplicar
- [ ] Sheet de dimensiones de materia → sección "Aplicar plantilla" **no aparece**

### 2.9 Aislamiento multi-tenant
- [ ] Admin de institución A no puede aplicar plantillas de institución B
- [ ] Intentar `POST /api/v1/materias/[id_B]/dimensiones/aplicar-plantilla` con `plantilla_id` de institución A → 404

---

## 3. Recuperatorios

**Ruta:** `Materias → [materia] → Evaluaciones` y editor de notas

### 3.1 Habilitar recuperatorio en evaluación
- [ ] Crear evaluación con "Permite recuperatorio" activado
- [ ] **Esperado:** en el editor de notas de esa evaluación aparece sección de recuperatorio al pie

### 3.2 Generar recuperatorio — requiere desaprobados
- [ ] Cargar notas donde todos aprueban (todos ≥ nota_aprobacion) → botón "Generar recuperatorio" aparece **deshabilitado**
- [ ] Modificar una nota por debajo del umbral → botón se habilita
- [ ] Click → recuperatorio creado
- [ ] **Esperado:** nueva evaluación "[nombre] — Recuperatorio" aparece en lista, badge "Recuperatorio"
- [ ] Intentar generar nuevamente → error "Ya existe un recuperatorio"

### 3.3 Recuperatorio hereda dimensiones
- [ ] Evaluación original tiene dimensiones asignadas (ej. Oral, Escrito)
- [ ] Generar recuperatorio
- [ ] Abrir editor de notas del recuperatorio
- [ ] **Esperado:** tabla tiene columnas Oral y Escrito (mismas dimensiones que el original)

### 3.4 Filtro de alumnos elegibles
- [ ] Evaluación con 4 alumnos: 2 aprobaron, 2 desaprobaron
- [ ] Generar recuperatorio → abrir editor
- [ ] **Esperado:** solo aparecen los 2 alumnos desaprobados
- [ ] Los 2 aprobados **no aparecen** en el recuperatorio

### 3.5 Bloqueo por dimensión
- [ ] Evaluación con dims Oral y Escrito. Alumno aprobó Oral (8) pero reprobó Escrito (3)
- [ ] En recuperatorio → alumno aparece
- [ ] Columna Oral: muestra "✓ Aprobado" (bloqueada, no editable)
- [ ] Columna Escrito: input habilitado para cargar nota

### 3.6 Alumno ausente en original
- [ ] Alumno marcado como ausente en la evaluación original
- [ ] **Esperado:** aparece en el recuperatorio (ausente = desaprobado)

### 3.7 Restricciones
- [ ] Evaluación sin "permite_recuperatorio" → botón no aparece
- [ ] No se puede crear recuperatorio de un recuperatorio

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

## Regresiones a verificar

Después de QA de nuevas funcionalidades, verificar que lo siguiente sigue funcionando:

- [ ] Editar materia (sheet unificado) → dimensiones se mantienen, no se pierden al guardar nombre/docente
- [ ] Notas de referencia sin dimensiones siguen funcionando (sin regresión)
- [ ] Crear alumno, asignar responsable, enviar invitación → responsable puede hacer login
- [ ] Cargar notas en evaluación normal → aparece en libreta del alumno
- [ ] Cerrar período → notas bloqueadas → reabrir → notas desbloqueadas
- [ ] Boletín del alumno → impresión/PDF funciona
- [ ] Calendario muestra evaluaciones correctamente
- [ ] Asistencia se puede cargar y aparece en libreta

---

## Bugs a reportar

Para cada bug encontrado:
- Pantalla / URL exacta
- Pasos para reproducir
- Comportamiento actual vs esperado
- Rol del usuario y nombre de la institución de prueba
