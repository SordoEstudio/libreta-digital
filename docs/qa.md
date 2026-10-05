# QA — Libreta Digital

Checklist para revisiones manuales antes de desplegar a producción.

---

## Diseño — Sistema de color y componentes

### Botones
- [ ] CTA primario (lime relleno) — solo para acciones principales, una por sección
- [ ] Secundario (borde lime) — acciones de navegación / accesos rápidos
- [ ] Outline / Ghost — acciones neutras o destructivas
- [ ] Íconos llevan `data-icon="inline-start"` (margen automático)
- [ ] Botones destructivos usan `variant="destructive"` (fondo rojo)
- [ ] Ningún botón tiene color hardcodeado fuera del sistema

### Badges
- [ ] Activo → `variant="default"` (lime)
- [ ] Inactivo → `variant="outline"` (neutral)
- [ ] Pendiente / advertencia → `variant="warning"` (amber)
- [ ] No mezclar semántica (ej: inactivo con lime)

### Cards
- [ ] Borde `border-harvi-blue-light` visible
- [ ] Sombra `shadow-sm` en reposo, `shadow-md` en hover
- [ ] Acción principal en `CardFooter` con `Button variant="secondary"`

### Sidebar
- [ ] Ítem activo: fondo lima, texto navy, ícono navy
- [ ] Ítem inactivo: fondo transparente, texto blanco, ícono blanco
- [ ] Hover: fondo lima/20

### Empty states
- [ ] Componente `EmptyState` usado (no texto plano)
- [ ] Ícono relevante al contexto
- [ ] Acción cuando corresponde

### Breadcrumbs
- [ ] Presentes en páginas de detalle
- [ ] Link al nivel anterior funcional

### Skeletons / loading
- [ ] `loading.tsx` existe para rutas con datos async
- [ ] Skeleton respeta layout de la página real

---

## Funcional — F1: Horarios estructurados

### Como admin
- [ ] Botón "Agregar horario" visible en cada materia del detalle del curso
- [ ] Sheet abre con título "Horario — {nombre materia}"
- [ ] Sin horarios: mensaje "Sin horarios cargados."
- [ ] Formulario: Día (select 1-7), Hora inicio, Hora fin, Aula (opcional)
- [ ] Validación: hora fin > hora inicio (rechaza si no)
- [ ] Agregar slot → aparece en lista sin recargar página
- [ ] Eliminar slot → se quita de lista sin recargar página
- [ ] Slots se muestran ordenados: día semana → hora inicio
- [ ] Botón muestra conteo actualizado ("2 slots" / "Agregar horario")

### Como docente (read-only)
- [ ] Horarios visibles en tarjeta materia (Lun 08:00–09:00 · Aula 3B)
- [ ] Si no hay horarios, no se muestra sección de horarios
- [ ] Docente NO ve el botón de HorariosSheet

### Permisos API
- [ ] GET `/api/v1/materias/[id]/horarios` — cualquier rol con acceso a la institución
- [ ] POST `/api/v1/materias/[id]/horarios` — solo admin / superadmin
- [ ] DELETE `/api/v1/materias/[id]/horarios/[id]` — solo admin / superadmin
- [ ] Intentar POST/DELETE como docente → 403

---

## Funcional — F2: Observaciones en notas

### Editor de notas
- [ ] Columna "Observación" visible en tabla de notas
- [ ] Input texto habilitado por defecto
- [ ] Marcar Ausente → input observación se deshabilita y limpia
- [ ] Desmarcar Ausente → input observación se habilita
- [ ] Al guardar con observación → se persiste en DB
- [ ] Al guardar sin observación (vacío) → campo queda null en DB
- [ ] Observación no pierde valor al cambiar nota numérica

### Libreta del alumno
- [ ] Observación visible en itálica, pequeña, bajo el valor de nota
- [ ] Sin observación → no se muestra espacio extra
- [ ] Alumno ausente → no muestra observación (columna vacía)

---

## Funcional — F3: Listado alumnos en detalle del curso

### Sección "Alumnos inscriptos" (admin only)
- [ ] Visible solo para admin / superadmin
- [ ] Docente / responsable NO ven la sección
- [ ] Conteo correcto en encabezado ("3 alumnos" / "1 alumno")
- [ ] Tabla: Nombre | Estado | Ver libreta
- [ ] Badge "Activo" (lime) / "Inactivo" (outline) según `activo`
- [ ] Alumno inactivo: fila con `opacity-60`
- [ ] Botón "Ver libreta" navega a `/dashboard/{slug}/libreta/{alumno_id}`
- [ ] Sin alumnos inscriptos → EmptyState con link a "Gestionar alumnos"
- [ ] Alumnos ordenados alfabéticamente por nombre

---

## Regresiones a verificar tras cada deploy

- [ ] Login y redirect por rol funcionan
- [ ] Crear/editar institución — slug correcto
- [ ] Invitar usuario — email llega, link funciona
- [ ] Notas bulk save — persiste y muestra toast
- [ ] Libreta alumno carga notas por materia
- [ ] Filtros en tablas (alumnos, usuarios, materias) no rompen con búsqueda vacía
