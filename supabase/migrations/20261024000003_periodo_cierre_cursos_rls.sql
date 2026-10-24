-- Enable RLS on periodo_cierre_cursos
ALTER TABLE periodo_cierre_cursos ENABLE ROW LEVEL SECURITY;

-- Admins and superadmins: full read/write for their institution's periods
CREATE POLICY periodo_cierre_cursos_admin ON periodo_cierre_cursos
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM periodos p
      WHERE p.id = periodo_cierre_cursos.periodo_id
        AND has_any_role(p.institucion_id, ARRAY['admin'])
    )
  )
  WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM periodos p
      WHERE p.id = periodo_cierre_cursos.periodo_id
        AND has_any_role(p.institucion_id, ARRAY['admin'])
    )
  );

-- Docentes and responsables: read-only (needed for cuaderno, boletin, confirmar pages)
CREATE POLICY periodo_cierre_cursos_read ON periodo_cierre_cursos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM periodos p
      WHERE p.id = periodo_cierre_cursos.periodo_id
        AND has_any_role(p.institucion_id, ARRAY['docente', 'responsable'])
    )
  );
