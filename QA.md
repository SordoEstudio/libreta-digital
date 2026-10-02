# QA — feat/g1-g5-functional

Branch deployado en Vercel. Ejecutar en orden: cada paso depende del anterior.

---

## Prerequisitos

- [x] `RESEND_API_KEY` seteada en Vercel (Production)
- [x] `EMAIL_FROM` = `Harvi Digital <hola@harvi.digital>` en Vercel (Production)
- [x] `harvi.digital` verificado en Resend
- [x] Deploy del branch activo

---

## 1. Admin — Setup desde cero

### 1.1 Año lectivo y periodos
- [x] Login como admin
- [x] Ir a **Configuración → Años lectivos**
- [x] Crear año lectivo "2026", marcar activo
- [x] Crear periodos (ej: Trimestre 1, Trimestre 2, Trimestre 3)
- [x] Verificar que aparece "Activo" en la lista

### 1.2 Cursos
- [x] Ir a **Cursos → Nuevo curso**
- [x] Crear curso "1º A" (año 2026)
- [x] Verificar que aparece en la lista

### 1.3 Catálogo de materias
- [x] Ir a **Materias → Nueva materia**
- [x] Crear "Matemáticas"
- [x] Crear "Lengua"
- [x] Editar nombre de una materia → verificar que actualiza
- [x] Intentar eliminar materia sin instancias → debe funcionar
- [x] Crear "Ciencias" para eliminar en este paso

### 1.4 Alumnos
- [x] Ir a **Alumnos → Nuevo alumno**
- [x] Crear alumno "Juan García"
- [x] Verificar que el select de curso muestra nombre (no UUID)
- [x] Asignar a curso "1º A"
- [x] Crear segundo alumno "Ana Pérez" sin curso
- [x] Verificar que campo email NO aparece en el formulario

### 1.5 Usuarios — invitar docente
- [ ] Ir a **Usuarios → Nuevo usuario**
- [ ] Nombre: "Prof. López", email real, rol: Docente
- [ ] Verificar que el select de rol muestra "Docente" (no valor UUID)
- [ ] Crear → verificar que aparece panel con link de acceso
- [ ] Copiar link → verificar que se copia al portapapeles
- [ ] Verificar que llega email desde `hola@harvi.digital`
- [ ] Si no llega email → usar el link copiado para continuar QA

### 1.6 Asignar materia al curso
- [ ] Ir a **Cursos → 1º A**
- [ ] Click "Agregar materia"
- [ ] Verificar combobox: tipear "Mat" → aparece "Matemáticas"
- [ ] Seleccionar "Matemáticas" → asignar docente Prof. López
- [ ] Verificar combobox: tipear "Fisica" (no existe) → aparece opción "Crear 'Fisica'"
- [ ] Seleccionar "Crear 'Fisica'" → verificar que se crea y aparece en el curso
- [ ] Ir a **Materias** → verificar que "Fisica" aparece en el catálogo con 1 instancia

### 1.7 Acciones sobre alumnos
- [x] Ir a **Alumnos** → acciones de "Ana Pérez"
- [x] **Cambiar curso** → asignar a "1º A" → verificar select muestra nombre
- [x] **Toggle inactivo** → verificar badge cambia a "Inactivo"
- [x] **Toggle activo** → verificar badge vuelve a "Activo"

### 1.8 Usuarios — desactivar
- [x] Ir a **Usuarios** → acciones sobre un usuario (no superadmin)
- [x] "Desactivar acceso" → confirmar → verificar desaparece de la lista

---

## 2. Docente — primer ingreso

- [x] Abrir link de invitación (del email o copiado en paso 1.5)
- [x] Setear contraseña → redirige al dashboard
- [x] Verificar sidebar muestra "Mis Materias"
- [x] Ir a **Mis Materias** → ver "Matemáticas" en "1º A"
- [x] Entrar a Matemáticas → **Nueva evaluación**
- [x] Crear evaluación "Primer parcial", tipo: parcial, periodo: Trimestre 1
- [x] Entrar a evaluación → cargar notas:
  - Juan García: 8
  tal vez al vorlver a cargar.
  new row violates row-level security policy for table "notas_historial"
  - Ana Pérez: marcar **Ausente**
  no puedo marcar ausente
- [x] Guardar → verificar toast "X notas guardadas"
- [ ] Verificar que la nota vacía (sin valor ni ausente) no se guarda

---

## 3. G7 — Gestión de responsables

### 3.1 Columna responsables en tabla alumnos
- [ ] Ir a **Alumnos** → verificar columna "Responsables" visible
- [ ] Juan García (sin responsables) → muestra "—"
- [ ] Hover sobre chip de un alumno con responsable → tooltip muestra nombre/email/relación

### 3.2 Sheet de responsables
- [ ] Acciones de "Juan García" → "Responsables"
- [ ] Sheet abre → "Sin responsables asignados."
- [ ] Sección "Agregar responsable" con select y campo relación
- [ ] Si no hay responsables creados: mensaje "No hay responsables disponibles..."
- [ ] Crear responsable vía Usuarios primero (si no existe), volver a este paso
- [ ] Agregar responsable a Juan García → relación "Padre"
- [ ] Verificar aparece en lista con nombre, email y relación
- [ ] Chip aparece en columna de la tabla
- [ ] Hover chip → tooltip muestra nombre/email/"Padre"
- [ ] Click en relación "Padre" → input inline → cambiar a "Tutor" → Guardar
- [ ] Verificar relación actualizada
- [ ] Botón trash → confirm → responsable desvinculado
- [ ] Columna vuelve a "—"

---

## 4. G8 — Crear responsable + asignar alumnos

- [ ] **Usuarios → Nuevo usuario**, rol: Responsable, email nuevo
- [ ] Crear → panel de invite link aparece
- [ ] Verificar sección "Asignar alumnos (opcional)" visible bajo el link
- [ ] Lista alumnos activos con checkboxes
- [ ] Seleccionar "Juan García" y "Ana Pérez" → botón "Asignar (2)"
- [ ] Click Asignar → toast "2 alumno(s) asignado(s)"
- [ ] Checkboxes se deshabilitan, mensaje de confirmación
- [ ] Click Listo → sheet cierra
- [ ] Ir a **Alumnos** → ambos alumnos tienen chip del responsable
- [ ] Verificar en sheet de responsables de Juan García → responsable aparece (sin relación)

---

## 5. Responsable — login y libreta

- [ ] Como admin: **Alumnos** → acciones de "Juan García"
- [ ] "Responsables" → verificar responsable asignado aparece
- [ ] Responsable: abrir link de invite → setear contraseña → login
- [ ] Verificar sidebar muestra "Mis alumnos"
- [ ] Click "Juan García" → ver libreta
- [ ] Verificar nota del "Primer parcial": 8 visible
- [ ] Verificar Ana Pérez aparece como "A" (Ausente)

---

## 6. Validaciones a verificar

| Caso | Resultado esperado |
|------|--------------------|
| Materia en catálogo con instancias → intentar eliminar | Error "La materia tiene instancias activas" |
| Nota numérica < 0 o > 10 | Input lo rechaza (min/max) |
| Crear usuario con email ya existente mismo rol | Error "Ya tiene ese rol" |
| Agregar materia con nombre existente (ilike) | Reutiliza entrada del catálogo (no duplicado) |
| Responsable intenta ver dashboard de admin | Redirect a /dashboard |

---

## 7. Post-QA

- [ ] Merge PR `feat/g1-g5-functional` → `master`
- [ ] Verificar deploy en producción de master
- [ ] Comenzar fase H (branding, responsive, UI polish)
