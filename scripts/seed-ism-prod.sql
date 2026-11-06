-- =============================================================
-- Seed producción: International School Meridian (ISM)
-- Reemplaza Instituto San Martín (u otra institución demo previa)
-- =============================================================
-- INSTRUCCIONES:
--   1. Ajustar las variables \set debajo con los emails reales de los usuarios @ism.com
--   2. Ejecutar en Supabase SQL Editor (con permisos de service_role / superadmin)
-- =============================================================

\set ADMIN_EMAIL    'admin@ism.com'
\set DOCENTE1_EMAIL 'laura@ism.com'
\set DOCENTE2_EMAIL 'martin@ism.com'

-- =============================================================
-- 1. Eliminar institución demo anterior (cascade borra todo lo relacionado)
-- =============================================================
DELETE FROM instituciones
WHERE slug IN ('san-martin', 'academia-demo', 'ism');

-- =============================================================
-- 2. Institución
-- =============================================================
INSERT INTO instituciones (id, nombre, tipo, slug)
VALUES ('aaaaaaaa-0000-0000-0000-000000000010', 'International School Meridian', 'academia', 'ism');

-- =============================================================
-- 3. Personas docentes (ON CONFLICT skip si ya existen)
-- =============================================================
INSERT INTO personas (nombre, apellido, email)
VALUES
  ('Laura',  'Fernández',  :'DOCENTE1_EMAIL'),
  ('Martín', 'Gutiérrez', :'DOCENTE2_EMAIL')
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- 4. Memberships
-- =============================================================

-- Admin
INSERT INTO memberships (persona_id, institucion_id, rol, activo)
SELECT p.id, i.id, 'admin', true
FROM personas p
CROSS JOIN instituciones i
WHERE p.email = :'ADMIN_EMAIL'
  AND i.slug = 'ism'
ON CONFLICT DO NOTHING;

-- Docentes
INSERT INTO memberships (persona_id, institucion_id, rol, activo)
SELECT p.id, i.id, 'docente', true
FROM personas p
CROSS JOIN instituciones i
WHERE p.email IN (:'DOCENTE1_EMAIL', :'DOCENTE2_EMAIL')
  AND i.slug = 'ism'
ON CONFLICT DO NOTHING;

-- =============================================================
-- 5. Año lectivo
-- =============================================================
INSERT INTO años_lectivos (id, institucion_id, nombre, activo)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000020',
  i.id,
  '2026',
  true
FROM instituciones i
WHERE i.slug = 'ism';

-- =============================================================
-- 6. Escala
-- =============================================================
INSERT INTO escalas (id, institucion_id, nombre, tipo, min_valor, max_valor)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000030',
  i.id,
  'Numérica 1-10',
  'numerica',
  1,
  10
FROM instituciones i
WHERE i.slug = 'ism';

-- =============================================================
-- 7. Períodos (1er cerrado, 2do activo)
-- =============================================================
INSERT INTO periodos (id, institucion_id, año_lectivo_id, nombre, orden, activo, cerrado_at)
SELECT
  pid,
  i.id,
  al.id,
  pnombre,
  porden,
  pactivo,
  pcierre
FROM
  instituciones i,
  años_lectivos al,
  (VALUES
    ('aaaaaaaa-0000-0000-0000-000000000040'::uuid, '1er Cuatrimestre', 1, false, (now() - interval '30 days')::timestamptz),
    ('aaaaaaaa-0000-0000-0000-000000000041'::uuid, '2do Cuatrimestre', 2, true,  null::timestamptz)
  ) AS p(pid, pnombre, porden, pactivo, pcierre)
WHERE i.slug = 'ism'
  AND al.institucion_id = i.id
  AND al.nombre = '2026';

-- =============================================================
-- 8. Cursos (6)
-- =============================================================
INSERT INTO cursos (id, institucion_id, año_lectivo_id, nombre, nivel, escala_id)
SELECT cid, i.id, al.id, cnombre, cnivel, e.id
FROM
  instituciones i,
  años_lectivos al,
  escalas e,
  (VALUES
    ('aaaaaaaa-0000-0000-0000-000000000050'::uuid, 'Beginner',          'A1'),
    ('aaaaaaaa-0000-0000-0000-000000000051'::uuid, 'Elementary',         'A2'),
    ('aaaaaaaa-0000-0000-0000-000000000052'::uuid, 'Pre-Intermediate',   'B1'),
    ('aaaaaaaa-0000-0000-0000-000000000053'::uuid, 'Intermediate',       'B2'),
    ('aaaaaaaa-0000-0000-0000-000000000054'::uuid, 'Upper-Intermediate', 'C1'),
    ('aaaaaaaa-0000-0000-0000-000000000055'::uuid, 'Advanced',           'C2')
  ) AS c(cid, cnombre, cnivel)
WHERE i.slug = 'ism'
  AND al.institucion_id = i.id AND al.nombre = '2026'
  AND e.institucion_id = i.id;

-- =============================================================
-- 9. Materias (1 "Inglés" por curso)
-- =============================================================
INSERT INTO materias (id, institucion_id, curso_id, nombre, escala_id)
SELECT
  ('aaaaaaaa-0000-0000-0000-00000000006' || num)::uuid,
  i.id,
  c.id,
  'Inglés',
  e.id
FROM
  instituciones i,
  escalas e,
  (VALUES
    ('0', 'aaaaaaaa-0000-0000-0000-000000000050'::uuid),
    ('1', 'aaaaaaaa-0000-0000-0000-000000000051'::uuid),
    ('2', 'aaaaaaaa-0000-0000-0000-000000000052'::uuid),
    ('3', 'aaaaaaaa-0000-0000-0000-000000000053'::uuid),
    ('4', 'aaaaaaaa-0000-0000-0000-000000000054'::uuid),
    ('5', 'aaaaaaaa-0000-0000-0000-000000000055'::uuid)
  ) AS m(num, cid)
JOIN cursos c ON c.id = cid
WHERE i.slug = 'ism'
  AND e.institucion_id = i.id;

-- =============================================================
-- 10. Materia_docentes
-- =============================================================

-- Laura → A1, A2, B1
INSERT INTO materia_docentes (materia_id, persona_id, institucion_id)
SELECT m.id, p.id, i.id
FROM materias m
JOIN cursos c ON c.id = m.curso_id
JOIN instituciones i ON i.id = m.institucion_id
JOIN personas p ON p.email = :'DOCENTE1_EMAIL'
WHERE i.slug = 'ism'
  AND c.nivel IN ('A1', 'A2', 'B1')
ON CONFLICT DO NOTHING;

-- Martín → B2, C1, C2
INSERT INTO materia_docentes (materia_id, persona_id, institucion_id)
SELECT m.id, p.id, i.id
FROM materias m
JOIN cursos c ON c.id = m.curso_id
JOIN instituciones i ON i.id = m.institucion_id
JOIN personas p ON p.email = :'DOCENTE2_EMAIL'
WHERE i.slug = 'ism'
  AND c.nivel IN ('B2', 'C1', 'C2')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 11. Dimensiones (4 por materia = 24 filas)
-- =============================================================
INSERT INTO materias_dimensiones (materia_id, nombre, peso, orden)
SELECT m.id, dim.nombre, 1, dim.orden
FROM materias m
JOIN cursos c ON c.id = m.curso_id
JOIN instituciones i ON i.id = m.institucion_id
CROSS JOIN (VALUES
  ('Reading',   1),
  ('Writing',   2),
  ('Listening', 3),
  ('Speaking',  4)
) AS dim(nombre, orden)
WHERE i.slug = 'ism';

-- =============================================================
-- 12. Alumnos (24, 4 por curso)
-- =============================================================
INSERT INTO alumnos (id, institucion_id, curso_id, nombre, apellido, activo)
SELECT aid, i.id, cid, anombre, aapellido, true
FROM instituciones i,
(VALUES
  -- A1 Beginner
  ('aaaaaaaa-0000-0000-0000-000000000100'::uuid, 'aaaaaaaa-0000-0000-0000-000000000050'::uuid, 'Valentina', 'García'),
  ('aaaaaaaa-0000-0000-0000-000000000101'::uuid, 'aaaaaaaa-0000-0000-0000-000000000050'::uuid, 'Tomás',     'López'),
  ('aaaaaaaa-0000-0000-0000-000000000102'::uuid, 'aaaaaaaa-0000-0000-0000-000000000050'::uuid, 'Lucía',     'Martínez'),
  ('aaaaaaaa-0000-0000-0000-000000000103'::uuid, 'aaaaaaaa-0000-0000-0000-000000000050'::uuid, 'Agustín',   'Rodríguez'),
  -- A2 Elementary
  ('aaaaaaaa-0000-0000-0000-000000000104'::uuid, 'aaaaaaaa-0000-0000-0000-000000000051'::uuid, 'Sofía',     'González'),
  ('aaaaaaaa-0000-0000-0000-000000000105'::uuid, 'aaaaaaaa-0000-0000-0000-000000000051'::uuid, 'Mateo',     'Fernández'),
  ('aaaaaaaa-0000-0000-0000-000000000106'::uuid, 'aaaaaaaa-0000-0000-0000-000000000051'::uuid, 'Camila',    'Díaz'),
  ('aaaaaaaa-0000-0000-0000-000000000107'::uuid, 'aaaaaaaa-0000-0000-0000-000000000051'::uuid, 'Nicolás',   'Torres'),
  -- B1 Pre-Intermediate
  ('aaaaaaaa-0000-0000-0000-000000000108'::uuid, 'aaaaaaaa-0000-0000-0000-000000000052'::uuid, 'Florencia', 'Ramírez'),
  ('aaaaaaaa-0000-0000-0000-000000000109'::uuid, 'aaaaaaaa-0000-0000-0000-000000000052'::uuid, 'Santiago',  'Morales'),
  ('aaaaaaaa-0000-0000-0000-000000000110'::uuid, 'aaaaaaaa-0000-0000-0000-000000000052'::uuid, 'Julieta',   'Álvarez'),
  ('aaaaaaaa-0000-0000-0000-000000000111'::uuid, 'aaaaaaaa-0000-0000-0000-000000000052'::uuid, 'Facundo',   'Ruiz'),
  -- B2 Intermediate
  ('aaaaaaaa-0000-0000-0000-000000000112'::uuid, 'aaaaaaaa-0000-0000-0000-000000000053'::uuid, 'Martina',   'Castro'),
  ('aaaaaaaa-0000-0000-0000-000000000113'::uuid, 'aaaaaaaa-0000-0000-0000-000000000053'::uuid, 'Ignacio',   'Sánchez'),
  ('aaaaaaaa-0000-0000-0000-000000000114'::uuid, 'aaaaaaaa-0000-0000-0000-000000000053'::uuid, 'Paula',     'Medina'),
  ('aaaaaaaa-0000-0000-0000-000000000115'::uuid, 'aaaaaaaa-0000-0000-0000-000000000053'::uuid, 'Leandro',   'Gómez'),
  -- C1 Upper-Intermediate
  ('aaaaaaaa-0000-0000-0000-000000000116'::uuid, 'aaaaaaaa-0000-0000-0000-000000000054'::uuid, 'Micaela',   'Herrera'),
  ('aaaaaaaa-0000-0000-0000-000000000117'::uuid, 'aaaaaaaa-0000-0000-0000-000000000054'::uuid, 'Rodrigo',   'Suárez'),
  ('aaaaaaaa-0000-0000-0000-000000000118'::uuid, 'aaaaaaaa-0000-0000-0000-000000000054'::uuid, 'Daniela',   'Acosta'),
  ('aaaaaaaa-0000-0000-0000-000000000119'::uuid, 'aaaaaaaa-0000-0000-0000-000000000054'::uuid, 'Emiliano',  'Vargas'),
  -- C2 Advanced
  ('aaaaaaaa-0000-0000-0000-000000000120'::uuid, 'aaaaaaaa-0000-0000-0000-000000000055'::uuid, 'Renata',    'Silva'),
  ('aaaaaaaa-0000-0000-0000-000000000121'::uuid, 'aaaaaaaa-0000-0000-0000-000000000055'::uuid, 'Ezequiel',  'Molina'),
  ('aaaaaaaa-0000-0000-0000-000000000122'::uuid, 'aaaaaaaa-0000-0000-0000-000000000055'::uuid, 'Jimena',    'Benítez'),
  ('aaaaaaaa-0000-0000-0000-000000000123'::uuid, 'aaaaaaaa-0000-0000-0000-000000000055'::uuid, 'Maximiliano','Reyes')
) AS a(aid, cid, anombre, aapellido)
WHERE i.slug = 'ism';

-- =============================================================
-- 13. Evaluaciones (2 por materia por período = 24 evaluaciones)
-- =============================================================
INSERT INTO evaluaciones (id, institucion_id, materia_id, periodo_id, nombre, tipo, peso, orden)
SELECT
  gen_random_uuid(),
  i.id,
  m.id,
  p.id,
  ev.nombre,
  'parcial',
  1,
  ev.orden
FROM instituciones i
JOIN años_lectivos al ON al.institucion_id = i.id AND al.nombre = '2026'
JOIN periodos p ON p.año_lectivo_id = al.id
JOIN materias m ON m.institucion_id = i.id
CROSS JOIN (VALUES ('Evaluación 1', 1), ('Evaluación 2', 2)) AS ev(nombre, orden)
WHERE i.slug = 'ism';

-- =============================================================
-- 14. Notas
--   1er Cuatrimestre: todos los alumnos (24) en ambas evaluaciones
--   2do Cuatrimestre: primeros 2 alumnos por curso (12) solo en Evaluación 1
-- =============================================================

-- 1er Cuatrimestre — todos los alumnos, ambas evaluaciones
INSERT INTO notas (institucion_id, alumno_id, evaluacion_id, docente_id, valor_numerico)
SELECT
  i.id,
  a.id,
  ev.id,
  d.id,
  6 + (('x' || substr(md5(a.id::text || ev.id::text), 1, 8))::bit(32)::int & 3)
FROM instituciones i
JOIN años_lectivos al ON al.institucion_id = i.id AND al.nombre = '2026'
JOIN periodos p       ON p.año_lectivo_id = al.id AND p.nombre = '1er Cuatrimestre'
JOIN cursos c         ON c.institucion_id = i.id
JOIN materias m       ON m.curso_id = c.id AND m.institucion_id = i.id
JOIN alumnos a        ON a.curso_id = c.id AND a.institucion_id = i.id AND a.deleted_at IS NULL
JOIN evaluaciones ev  ON ev.materia_id = m.id AND ev.periodo_id = p.id AND ev.deleted_at IS NULL
JOIN personas d       ON (
  (d.email = :'DOCENTE1_EMAIL' AND c.nivel IN ('A1','A2','B1')) OR
  (d.email = :'DOCENTE2_EMAIL' AND c.nivel IN ('B2','C1','C2'))
)
WHERE i.slug = 'ism'
ON CONFLICT (alumno_id, evaluacion_id) DO NOTHING;

-- 2do Cuatrimestre — primeros 2 alumnos por curso (por id), solo Evaluación 1
INSERT INTO notas (institucion_id, alumno_id, evaluacion_id, docente_id, valor_numerico)
SELECT
  i.id,
  a.id,
  ev.id,
  d.id,
  7 + (('x' || substr(md5(a.id::text || ev.id::text), 1, 8))::bit(32)::int & 2)
FROM instituciones i
JOIN años_lectivos al ON al.institucion_id = i.id AND al.nombre = '2026'
JOIN periodos p       ON p.año_lectivo_id = al.id AND p.nombre = '2do Cuatrimestre'
JOIN cursos c         ON c.institucion_id = i.id
JOIN materias m       ON m.curso_id = c.id AND m.institucion_id = i.id
JOIN (
  SELECT a2.id, a2.curso_id
  FROM (
    SELECT a3.id, a3.curso_id,
           ROW_NUMBER() OVER (PARTITION BY a3.curso_id ORDER BY a3.id) AS rn
    FROM alumnos a3
    JOIN instituciones i3 ON i3.id = a3.institucion_id AND i3.slug = 'ism'
    WHERE a3.deleted_at IS NULL
  ) a2
  WHERE a2.rn <= 2
) a ON a.curso_id = c.id
JOIN evaluaciones ev  ON ev.materia_id = m.id AND ev.periodo_id = p.id
                      AND ev.nombre = 'Evaluación 1' AND ev.deleted_at IS NULL
JOIN personas d       ON (
  (d.email = :'DOCENTE1_EMAIL' AND c.nivel IN ('A1','A2','B1')) OR
  (d.email = :'DOCENTE2_EMAIL' AND c.nivel IN ('B2','C1','C2'))
)
WHERE i.slug = 'ism'
ON CONFLICT (alumno_id, evaluacion_id) DO NOTHING;

-- =============================================================
-- 15. Comunicados (2)
-- =============================================================
INSERT INTO comunicados (institucion_id, autor_id, titulo, contenido, curso_id)
SELECT
  i.id,
  admin_p.id,
  'Bienvenidos al 2do Cuatrimestre',
  'Les damos la bienvenida al segundo cuatrimestre 2026. Recordamos que las evaluaciones comenzarán la tercera semana de julio. Cualquier consulta, comunicarse con la coordinación académica.',
  c.id
FROM instituciones i
JOIN personas admin_p ON admin_p.email = :'ADMIN_EMAIL'
JOIN cursos c ON c.institucion_id = i.id AND c.nivel = 'B1'
WHERE i.slug = 'ism';

INSERT INTO comunicados (institucion_id, autor_id, titulo, contenido, curso_id)
SELECT
  i.id,
  d.id,
  'Aviso sobre evaluación de Speaking',
  'El próximo martes realizaremos la evaluación oral de Speaking correspondiente al 2do Cuatrimestre. La evaluación será individual y durará aproximadamente 10 minutos por alumno. Por favor, preparar el tema "Daily Routines and Future Plans".',
  c.id
FROM instituciones i
JOIN personas d ON d.email = :'DOCENTE2_EMAIL'
JOIN cursos c ON c.institucion_id = i.id AND c.nivel = 'C1'
WHERE i.slug = 'ism';

-- =============================================================
-- Verificación
-- =============================================================
SELECT
  i.nombre AS institucion,
  COUNT(DISTINCT c.id) AS cursos,
  COUNT(DISTINCT a.id) AS alumnos,
  COUNT(DISTINCT n.id) AS notas,
  COUNT(DISTINCT com.id) AS comunicados
FROM instituciones i
LEFT JOIN cursos c ON c.institucion_id = i.id AND c.deleted_at IS NULL
LEFT JOIN alumnos a ON a.institucion_id = i.id AND a.deleted_at IS NULL
LEFT JOIN materias m ON m.institucion_id = i.id AND m.deleted_at IS NULL
LEFT JOIN evaluaciones ev ON ev.institucion_id = i.id AND ev.deleted_at IS NULL
LEFT JOIN notas n ON n.institucion_id = i.id AND n.deleted_at IS NULL
LEFT JOIN comunicados com ON com.institucion_id = i.id AND com.deleted_at IS NULL
WHERE i.slug = 'ism'
GROUP BY i.nombre;
