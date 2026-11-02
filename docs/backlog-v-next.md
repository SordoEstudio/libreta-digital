# Backlog — próxima versión

Mejoras identificadas en revisión de producto (nov 2026). Fuente: análisis GPT + evaluación interna.
No urgentes. Implementar antes de ampliar ventas.

---

## UX / Textos

### 1. Typo "dimensiónes"
Buscar en todo el codebase (UI, manuales, emails). Corregir por "dimensiones".

### 2. "Guardar todo" vs "Guardar notas"
El manual menciona "Guardar todo"; la UI del cuaderno dice "Guardar notas".
Unificar en "Guardar notas" (es más específico).

### 3. "Nueva evaluación" → "Nueva evaluación de referencia"
En el cuaderno, el botón `CuadernoNuevaInstanciaBtn` abre solo evaluaciones de referencia.
El label actual no lo deja claro. Renombrar.

### 4. "Libreta" vs "Referencia" en cuaderno
Agregar un subtítulo o tooltip corto que explique la diferencia:
- **Libreta**: notas que se publican en el boletín
- **Referencia**: notas de proceso, no se publican

---

## Menú / Navegación

### 5. Renombrar ítems del sidebar
Ítems actuales con nombres que requieren contexto previo:

| Actual | Propuesto | Pendiente definir |
|--------|-----------|-------------------|
| Acuses | ¿"Confirmaciones de boletines"? | Confirmar con Pablo |
| Ev. institucionales | "Evaluaciones institucionales" | — |
| Dim. plantillas | "Plantillas de dimensiones" | — |

### 6. ¿Agrupar sidebar en secciones?
GPT sugirió agrupar en: académico / comunicación / configuración.
**Pendiente definir** si solo renombramos o también restructuramos la jerarquía.

---

## Datos / Estado vacío

### 7. "0/0" en comunicados y acuses
Cuando no hay destinatarios asignados, el badge muestra "0/0".
Mostrar "Sin destinatarios" o "Sin responsables vinculados" según el contexto.
Archivos a tocar: `comunicados-tabla.tsx`, vista de acuses.

---

## Navegación contextual

### 8. "Volver" desde libreta no devuelve al origen
GPT reportó: abrir una libreta desde un curso y "Volver" llevaba a Alumnos en lugar del curso.
Verificar los flujos con parámetro `?from=` o historial de navegación.
**Pendiente confirmar si Pablo lo reproduce.**

---

## Dashboard admin (diferido)

### 9. Panel de pendientes en home del admin
Idea: mostrar métricas accionables en el inicio:
- Alumnos sin responsable vinculado
- Boletines publicados sin confirmar
- Evaluaciones sin notas cargadas

**Diferido.** Requiere definir qué métricas importan más para el primer cliente real.
Prioridad: post-primer cliente en producción.

---

## Notas del análisis GPT

- El análisis fue solo desktop, rol administrador, sin guardar cambios.
- No se probó: acceso docente/responsable independiente, mobile, entrega real de emails, seguridad.
- Flujos a validar antes de ampliar ventas: importación de alumnos desde planilla, continuidad al siguiente ciclo lectivo.
- Ver archivo fuente: `docs/Libreta digital FB de Chatgpt.md`
