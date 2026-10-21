# Manual del Administrador

Como administrador tenés control total de la institución: usuarios, alumnos, configuración y datos académicos.

---

## Primeros pasos

### Configurar la institución

Antes de cargar datos, completá la configuración inicial en **Configuración**:

1. Subí el logo de la institución (cuadrado e rectangular)
2. Creá el **año lectivo** activo
3. Definí los **períodos** del año (1er trimestre, 2do trimestre, etc.)
4. Creá los **cursos** con su nivel y turno
5. Agregá las **materias** a cada curso y asigná docentes

---

## Usuarios

### Crear un usuario

1. Ir a **Usuarios** → botón **Nuevo usuario**
2. Completar apellido, nombre, email y rol (Admin / Docente / Responsable)
3. Si el email es `@gmail.com`, aparece la opción **Ingresa con Google** — activala si el usuario usará Google para ingresar
4. Hacer clic en **Crear usuario**

El usuario recibe un email de bienvenida:
- Con link de contraseña (usuarios sin Google)
- Con instrucciones para ingresar (usuarios Google)

### Roles disponibles

| Rol | Qué puede hacer |
|-----|----------------|
| **Admin** | Todo — igual que vos |
| **Docente** | Sus materias: notas, asistencia, cuaderno, contenidos |
| **Responsable** | Ver libretas de sus alumnos, confirmar comunicados |

### Asignar alumnos a un responsable

Al crear un responsable, después de guardar podés seleccionar sus alumnos directamente desde el formulario.

También podés hacerlo desde **Alumnos** → editar alumno → sección Responsables.

---

## Alumnos

### Crear un alumno

1. Ir a **Alumnos** → botón **Nuevo alumno**
2. Completar apellido, nombre y seleccionar curso
3. Guardar

### Inscribir a otro curso

Desde la tabla de alumnos podés cambiar la inscripción de un alumno a otro curso activo.

---

## Configuración académica

### Años lectivos y períodos

En **Configuración** podés:

- Crear el año lectivo (ej: 2026)
- Agregar períodos con nombre y orden (ej: 1er Trimestre, 2do Trimestre, 3er Trimestre)
- **Cerrar un período** cuando termina — los docentes pasan a modo solo lectura en ese período

> Los períodos cerrados no permiten cargar ni modificar notas. El botón "Cargar" cambia a "Ver".

### Cerrar un período

1. Ir a **Configuración** → sección Períodos
2. Hacer clic en **Cerrar período** junto al período que terminó
3. Confirmar — se envía notificación a docentes

### Materias y dimensiones

Las dimensiones son los criterios de evaluación de una materia (ej: Oral, Escrito, Práctico).

- Sin dimensiones → nota única por evaluación
- Con dimensiones → nota por cada criterio, promedio automático

Para crear una plantilla de dimensiones reutilizable: **Configuración** → **Plantillas de dimensiones**

### Evaluaciones institucionales

Son evaluaciones que se crean una sola vez y se propagan a todas las materias automáticamente.

1. Ir a **Evaluaciones institucionales**
2. Crear plantilla con nombre, tipo, período y peso
3. Se crea automáticamente en cada materia activa

---

## Cuaderno de notas

El cuaderno es la vista principal de notas por materia.

1. Ir a **Cuaderno**
2. Seleccionar materia y período (o **Anual** para notas finales)
3. Ver tabla de alumnos con sus notas por evaluación

Desde el cuaderno podés crear nuevas evaluaciones para la materia directamente.

---

## Comunicados

Los comunicados son mensajes a responsables que requieren confirmación.

1. Ir a **Comunicados** → **Nuevo comunicado**
2. Completar título, contenido y seleccionar curso/materia destino
3. Enviar

Podés ver cuántos responsables confirmaron desde la lista de comunicados.

---

## Contenidos

Si el módulo de contenidos está habilitado, los docentes pueden compartir materiales (links, archivos) organizados por unidades.

Como admin podés ver todos los contenidos de todas las materias.

---

## Calendario

El calendario muestra el horario semanal de todas las materias y las evaluaciones programadas con fecha.

Cada usuario puede descargar el calendario en formato iCal para importarlo a Google Calendar u otras apps.

---

## Libretas y boletines

Desde **Alumnos** → nombre del alumno podés ver la libreta completa con:

- Notas por materia y período
- Asistencia por materia
- Vista imprimible para entregar a familias
