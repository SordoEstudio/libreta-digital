-- Allow null peso on materias_dimensiones (null = equal weight / direct average)
ALTER TABLE materias_dimensiones ALTER COLUMN peso DROP NOT NULL;
ALTER TABLE materias_dimensiones ALTER COLUMN peso DROP DEFAULT;
ALTER TABLE materias_dimensiones DROP CONSTRAINT IF EXISTS materias_dimensiones_peso_check;
ALTER TABLE materias_dimensiones ADD CONSTRAINT materias_dimensiones_peso_check CHECK (peso IS NULL OR peso > 0);
