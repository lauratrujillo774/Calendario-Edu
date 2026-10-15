-- Estructura académica: grados, materias de cada grado (pensum), perfiles completos de usuarios y,
-- para los docentes, los grados y materias que dictan. Los datos existentes se conservan y se enlazan.
-- @@UP
CREATE TABLE IF NOT EXISTS grados (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL,
  orden TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grado_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
INSERT IGNORE INTO grados (nombre, orden) VALUES
  ('Transición', 0), ('1°', 1), ('2°', 2), ('3°', 3), ('4°', 4), ('5°', 5), ('6°', 6), ('7°', 7), ('8°', 8), ('9°', 9), ('10°', 10), ('11°', 11)
--//
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS grado_id TINYINT UNSIGNED NULL AFTER nombre
--//
ALTER TABLE grupos ADD CONSTRAINT fk_grupo_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE SET NULL ON UPDATE CASCADE
--//
UPDATE grupos g JOIN grados gr ON gr.orden > 0 AND g.nombre LIKE CONCAT(gr.orden, '-%') SET g.grado_id = gr.id WHERE g.grado_id IS NULL
--//
CREATE TABLE IF NOT EXISTS grado_materias (
  grado_id TINYINT UNSIGNED NOT NULL,
  materia_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (grado_id, materia_id),
  KEY idx_gm_materia (materia_id),
  CONSTRAINT fk_gm_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_gm_materia FOREIGN KEY (materia_id) REFERENCES materias (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
INSERT IGNORE INTO grado_materias (grado_id, materia_id)
  SELECT DISTINCT g.grado_id, a.materia_id FROM asignaciones a JOIN grupos g ON g.id = a.grupo_id WHERE g.grado_id IS NOT NULL
--//
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS identificacion VARCHAR(20) NULL AFTER correo,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE NULL AFTER identificacion,
  ADD COLUMN IF NOT EXISTS grado_id TINYINT UNSIGNED NULL AFTER fecha_nacimiento,
  ADD COLUMN IF NOT EXISTS foto VARCHAR(255) NULL AFTER grado_id,
  ADD COLUMN IF NOT EXISTS notif_correo TINYINT(1) NOT NULL DEFAULT 1
--//
ALTER TABLE usuarios ADD UNIQUE KEY uq_usuarios_identificacion (identificacion)
--//
ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE SET NULL ON UPDATE CASCADE
--//
UPDATE usuarios u JOIN matriculas m ON m.estudiante_id = u.id JOIN grupos g ON g.id = m.grupo_id
  SET u.grado_id = g.grado_id WHERE u.grado_id IS NULL AND g.grado_id IS NOT NULL
--//
CREATE TABLE IF NOT EXISTS docente_grados (
  usuario_id INT UNSIGNED NOT NULL,
  grado_id TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (usuario_id, grado_id),
  KEY idx_dg_grado (grado_id),
  CONSTRAINT fk_dg_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dg_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS docente_materias (
  usuario_id INT UNSIGNED NOT NULL,
  materia_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (usuario_id, materia_id),
  KEY idx_dm_materia (materia_id),
  CONSTRAINT fk_dm_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dm_materia FOREIGN KEY (materia_id) REFERENCES materias (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
INSERT IGNORE INTO docente_materias (usuario_id, materia_id) SELECT DISTINCT profesor_id, materia_id FROM asignaciones
--//
INSERT IGNORE INTO docente_grados (usuario_id, grado_id)
  SELECT DISTINCT a.profesor_id, g.grado_id FROM asignaciones a JOIN grupos g ON g.id = a.grupo_id WHERE g.grado_id IS NOT NULL
-- @@DOWN
DROP TABLE IF EXISTS docente_materias
--//
DROP TABLE IF EXISTS docente_grados
--//
ALTER TABLE usuarios DROP FOREIGN KEY IF EXISTS fk_usuario_grado
--//
ALTER TABLE usuarios DROP KEY IF EXISTS uq_usuarios_identificacion
--//
ALTER TABLE usuarios DROP COLUMN IF EXISTS notif_correo, DROP COLUMN IF EXISTS foto, DROP COLUMN IF EXISTS grado_id, DROP COLUMN IF EXISTS fecha_nacimiento, DROP COLUMN IF EXISTS identificacion
--//
DROP TABLE IF EXISTS grado_materias
--//
ALTER TABLE grupos DROP FOREIGN KEY IF EXISTS fk_grupo_grado
--//
ALTER TABLE grupos DROP COLUMN IF EXISTS grado_id
--//
DROP TABLE IF EXISTS grados
