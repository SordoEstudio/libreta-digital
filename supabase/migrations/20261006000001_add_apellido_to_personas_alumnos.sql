ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS apellido TEXT;

ALTER TABLE alumnos
  ADD COLUMN IF NOT EXISTS apellido TEXT;

-- Migrate existing data: last word of nombre → apellido, rest → nombre
UPDATE personas
SET
  apellido = split_part(nombre, ' ', array_length(string_to_array(trim(nombre), ' '), 1)),
  nombre   = left(trim(nombre), length(trim(nombre)) - length(split_part(trim(nombre), ' ', array_length(string_to_array(trim(nombre), ' '), 1))) - 1)
WHERE trim(nombre) LIKE '% %';

UPDATE alumnos
SET
  apellido = split_part(nombre, ' ', array_length(string_to_array(trim(nombre), ' '), 1)),
  nombre   = left(trim(nombre), length(trim(nombre)) - length(split_part(trim(nombre), ' ', array_length(string_to_array(trim(nombre), ' '), 1))) - 1)
WHERE trim(nombre) LIKE '% %';

CREATE INDEX IF NOT EXISTS idx_personas_apellido ON personas(apellido)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alumnos_apellido ON alumnos(apellido)
  WHERE deleted_at IS NULL;
