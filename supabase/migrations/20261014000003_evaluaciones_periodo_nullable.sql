-- Make periodo_id nullable on evaluaciones and evaluaciones_template
-- NULL = evaluación anual / global (no period-specific)

ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_periodo_id_fkey;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_periodo_id_fkey
  FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE SET NULL;
ALTER TABLE evaluaciones ALTER COLUMN periodo_id DROP NOT NULL;

ALTER TABLE evaluaciones_template DROP CONSTRAINT evaluaciones_template_periodo_id_fkey;
ALTER TABLE evaluaciones_template ADD CONSTRAINT evaluaciones_template_periodo_id_fkey
  FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE SET NULL;
ALTER TABLE evaluaciones_template ALTER COLUMN periodo_id DROP NOT NULL;
