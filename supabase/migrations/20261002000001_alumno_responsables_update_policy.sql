CREATE POLICY alumno_responsables_update ON alumno_responsables
  FOR UPDATE USING (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  ) WITH CHECK (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );
