-- Allow admin users to insert and update notas (not just docentes)
CREATE POLICY notas_admin_write ON notas
  FOR INSERT WITH CHECK (
    docente_id = get_persona_id()
    AND (is_superadmin() OR has_role(institucion_id, 'admin'))
  );

CREATE POLICY notas_admin_update ON notas
  FOR UPDATE USING (
    is_superadmin() OR has_role(institucion_id, 'admin')
  );
