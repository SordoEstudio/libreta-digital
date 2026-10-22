-- 1. Extend memberships rol check to include 'alumno'
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_rol_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_rol_check
  CHECK (rol IN ('superadmin', 'admin', 'docente', 'responsable', 'alumno'));

-- 2. alumno can read their own alumno record (alumnos.persona_id = their persona)
CREATE POLICY alumnos_alumno ON alumnos
  FOR SELECT USING (persona_id = get_persona_id());

-- 3. alumno can read their own inscripciones
CREATE POLICY alumno_inscripciones_alumno ON alumno_inscripciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alumnos a
      WHERE a.id = alumno_inscripciones.alumno_id
        AND a.persona_id = get_persona_id()
    )
  );

-- 4. alumno can read their own notas
CREATE POLICY notas_alumno_select ON notas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alumnos a
      WHERE a.id = notas.alumno_id
        AND a.persona_id = get_persona_id()
    )
  );

-- 5. Institution-scoped reference data: alumno reads their institution's data
CREATE POLICY años_lectivos_alumno ON años_lectivos
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY periodos_alumno ON periodos
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY escalas_alumno ON escalas
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY escala_valores_alumno ON escala_valores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escalas e
      WHERE e.id = escala_valores.escala_id
        AND has_role(e.institucion_id, 'alumno')
    )
  );

CREATE POLICY cursos_alumno ON cursos
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY materias_alumno ON materias
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY materias_catalogo_alumno ON materias_catalogo
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY evaluaciones_alumno ON evaluaciones
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY evaluaciones_template_alumno ON evaluaciones_template
  FOR SELECT USING (has_role(institucion_id, 'alumno'));

CREATE POLICY mat_dim_alumno ON materias_dimensiones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materias m
      WHERE m.id = materias_dimensiones.materia_id
        AND has_role(m.institucion_id, 'alumno')
    )
  );
