ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_tipo_check;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_tipo_check
  CHECK (tipo IN ('parcial', 'final', 'recuperatorio', 'tp', 'concepto', 'definitiva_anual'));

ALTER TABLE evaluaciones_template DROP CONSTRAINT evaluaciones_template_tipo_check;
ALTER TABLE evaluaciones_template ADD CONSTRAINT evaluaciones_template_tipo_check
  CHECK (tipo IN ('parcial', 'final', 'recuperatorio', 'tp', 'concepto', 'definitiva_anual'));
