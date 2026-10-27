# Manual del Administrador

Como administrador tenés control total de la institución: usuarios, alumnos, configuración académica y datos.

---

## Primeros pasos

### Configurar la institución

Antes de cargar datos, completá la configuración inicial:

1. **Configuración** → subí el logo cuadrado y rectangular
2. **Años y cursos** → creá el año lectivo activo
3. Definí los **períodos** del año (ej: 1er Bimestre, 2do Bimestre, 3er Bimestre)
4. Creá los **cursos** con su nivel y turno
5. En cada curso, agregá las **materias** y asigná docentes

---

## Personal y usuarios

### Docentes y administradores

Ir a **Personal** → botón **Nuevo usuario**. Completar apellido, nombre, email y rol.

El usuario recibe un email de bienvenida con instrucciones para ingresar.

### Responsables

Ir a **Responsables** → botón **Nuevo responsable**. Al crear un responsable podés vincularle alumnos directamente desde el formulario.

También podés vincular desde **Alumnos** → editar alumno → sección Responsables.

### Roles disponibles

| Rol | Qué puede hacer |
|-----|----------------|
| **Admin** | Todo — igual que vos |
| **Docente** | Sus materias: notas, asistencia, cuaderno, contenidos, comunicados |
| **Responsable** | Ver boletines, confirmar comunicados, ver contenidos |

---

## Alumnos

### Crear un alumno

1. Ir a **Alumnos** → botón **Nuevo alumno**
2. Completar apellido, nombre y seleccionar curso
3. Guardar

### Libreta de un alumno

Desde **Alumnos** → nombre del alumno → ver notas por materia, asistencia y boletín.

---

## Configuración académica

### Años lectivos y períodos

En **Años y cursos** podés crear el año lectivo, agregar períodos y gestionar cursos.

### Materias y dimensiones

Las dimensiones son los criterios de evaluación de una materia.

- **Sin dimensiones** → nota única por evaluación
- **Con dimensiones** → nota por cada criterio (Oral, Escrito, etc.), promedio automático
- **Sin peso** → promedio directo entre dimensiones
- **Con peso %** → cada dimensión pondera su porcentaje en el promedio

Tipos de dimensión:
- **Numérica** → nota del 1 al 10
- **Conceptual** → valoración cualitativa (MB, B, S, etc.)

Para crear una plantilla reutilizable: **Dim. plantillas** → Nueva plantilla. Podés aplicarla a una materia o a todas las materias de una vez.

### Evaluaciones institucionales

Son evaluaciones que se crean una sola vez y se propagan automáticamente a todas las materias activas.

Ir a **Ev. institucionales** → crear con nombre, tipo, período y peso.

---

## Cuaderno de notas

El cuaderno es la vista principal de notas por materia. Muestra una tabla con todos los alumnos del curso y sus evaluaciones.

1. Ir a **Cuaderno**
2. Seleccionar materia y período (se preseleccionan automáticamente)
3. La tabla tiene tres grupos de columnas: **Libreta**, **Referencia** y **Nota definitiva**

### Cargar notas inline

En el grupo Libreta podés ingresar notas directamente en la tabla sin abrir otra pantalla. Hacé clic en cualquier celda, escribí la nota y guardá con el botón **Guardar todo**.

### Ver evaluación completa

Pasá el mouse por encima del nombre de la evaluación → aparece el ícono ↗ → hacé clic para abrir el editor completo con todos los controles.

### Recuperatorios

Si un alumno desaprobó, la columna de recuperatorio (marcada **R**) aparece al lado de la evaluación original. Podés cargar la nota del recuperatorio directamente en esa columna.

---

## Cierre de período

### Cierre global

1. Ir a **Años y cursos** → año → período activo
2. Botón **Cerrar período** → se muestra un preview de datos faltantes (alumnos sin nota, materias sin asistencia)
3. Podés cerrar aunque haya datos faltantes
4. Período cerrado → los docentes no pueden modificar notas

### Publicar el período

Después de cerrar, el botón **Publicar** hace visible el boletín a los responsables.

### Notificar a responsables

Una vez publicado, el botón **Notificar** envía un email a todos los responsables con link al boletín.

### Cierre granular por curso

En la pestaña **Por curso** podés gestionar cada curso de forma independiente:

- **Cerrar** un curso → bloquea notas solo de ese curso
- **Publicar** → boletín visible para ese curso
- **Notificar** → email solo a responsables de ese curso
- **Despublicar** → vuelve a ocultar el boletín
- **Reabrir** → desbloquea notas (revierte cierre y publicación)

Útil cuando querés cerrar los cursos a medida que van terminando sin esperar al período completo.

### Reabrir un período

El botón **Reabrir** revierte el cierre y vuelve a permitir la carga de notas.

---

## Comunicados

Los comunicados son mensajes a responsables que requieren confirmación de lectura.

1. Ir a **Comunicados** → **Nuevo comunicado**
2. Completar título, contenido y seleccionar curso destino
3. Enviar → los responsables reciben email con link de confirmación

Desde la lista de comunicados podés ver cuántos responsables confirmaron (`N/M` confirmaron).

---

## Acuses de boletín

Los acuses registran cuándo cada responsable confirmó haber recibido el boletín de su hijo/a.

Ir a **Acuses** → seleccionar período → ver tabla de alumnos con el estado de confirmación de cada responsable.

- ✓ con fecha → confirmado
- Sin confirmación → pendiente

---

## Registro de actividad

El registro de **Actividad** muestra un historial de las últimas 500 acciones realizadas en la institución: alta de usuarios, cambios de rol, cierres de período, carga de notas, etc.

Usalo para auditar cambios o verificar que las acciones se realizaron correctamente.

---

## Contenidos

Si el módulo de contenidos está habilitado, los docentes pueden compartir materiales (links, archivos, imágenes) organizados por unidades.

Como admin podés ver todos los contenidos de todas las materias.

---

## Libretas y boletines

Desde **Alumnos** → nombre del alumno → **Boletín** podés ver el boletín completo con:

- Notas por materia, dimensión y período
- Asistencia por materia
- Vista imprimible para entregar a familias
