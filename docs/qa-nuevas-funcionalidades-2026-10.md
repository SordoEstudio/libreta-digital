# QA — Nuevas funcionalidades (Octubre 2026)

**Alcance:** Dimensiones por materia · Peso opcional (promedio directo) · Plantillas de dimensiones · Recuperatorios · Notas de referencia · Cierre de período · Comunicados con confirmación  
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

**Ruta:** `Configuración → Materias → [materia] → Dimensiones`

### 1.1 Crear dimensiones
- [ ] Admin abre materia → pestaña/sección Dimensiones
- [ ] Crear dimensión "Trabajo en clase" peso 40
- [ ] Crear dimensión "Examen" peso 60
- **Esperado:** suma de pesos = 100, ambas aparecen en lista

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

### 1.5 Asignar evaluación a dimensión
- [ ] Ir a Evaluaciones de la materia → crear nueva evaluación
- [ ] Seleccionar dimensión en el formulario
- [ ] **Esperado:** evaluación aparece con la dimensión en la lista

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

### 2.7 Aplicar plantilla a todo el curso (bulk)
- [ ] Ir a página del curso → botón "Aplicar plantilla al curso" (junto a "Nueva materia")
- [ ] Click → AlertDialog abre con select de plantilla
- [ ] Seleccionar plantilla → Confirmar
- [ ] **Esperado:** toast "Plantilla aplicada a N materia(s)", todas las materias del curso con nuevas dimensiones

### 2.8 Curso sin plantillas creadas
- [ ] Institución sin ninguna plantilla → botón "Aplicar plantilla al curso" **no aparece**
- [ ] Sheet de dimensiones de materia → sección "Aplicar plantilla" **no aparece**

### 2.9 Aislamiento multi-tenant
- [ ] Admin de institución A no puede aplicar plantillas de institución B
- [ ] Intentar `POST /api/v1/materias/[id_B]/dimensiones/aplicar-plantilla` con `plantilla_id` de institución A → 404

---

## 3. Recuperatorios

**Ruta:** `Materias → [materia] → Evaluaciones`

### 3.1 Habilitar recuperatorio en evaluación
- [ ] Crear evaluación con "Permite recuperatorio" activado
- [ ] **Esperado:** evaluación marcada con badge o indicador visual

### 3.2 Generar recuperatorio
- [ ] En evaluación con recuperatorio habilitado → botón "Generar recuperatorio"
- [ ] Confirmar acción
- [ ] **Esperado:** nueva evaluación tipo "Recuperatorio de [nombre original]" aparece en la lista
- [ ] Intentar generar nuevamente → error (ya existe)

### 3.3 Cargar notas del recuperatorio
- [ ] Abrir evaluación recuperatorio → cargar notas para 2 alumnos
- [ ] Guardar → notas persisten

### 3.4 Restricciones
- [ ] Evaluación sin "permite_recuperatorio" → botón no aparece
- [ ] Eliminar evaluación original → recuperatorio no se ve afectado (o advertencia)

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

## Regresiones a verificar

Después de QA de nuevas funcionalidades, verificar que lo siguiente sigue funcionando:

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
