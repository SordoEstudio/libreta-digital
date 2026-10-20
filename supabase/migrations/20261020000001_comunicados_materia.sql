ALTER TABLE comunicados ADD COLUMN materia_id UUID REFERENCES materias(id) ON DELETE RESTRICT;
CREATE INDEX idx_comunicados_materia ON comunicados(materia_id);
