-- Clases de un docente: cada fila dice qué materia dicta en qué grado (y opcionalmente en qué grupo; sin grupo = todos los del grado).
-- Reemplaza el cruce "todos los grados × todas las materias": ahora cada grado lleva su(s) materia(s).
-- @@UP
CREATE TABLE IF NOT EXISTS docente_clases (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  grado_id TINYINT UNSIGNED NOT NULL,
  materia_id INT UNSIGNED NOT NULL,
  grupo_id INT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_dcl_usuario (usuario_id),
  KEY idx_dcl_grado (grado_id),
  KEY idx_dcl_materia (materia_id),
  KEY idx_dcl_grupo (grupo_id),
  CONSTRAINT fk_dcl_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dcl_grado FOREIGN KEY (grado_id) REFERENCES grados (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dcl_materia FOREIGN KEY (materia_id) REFERENCES materias (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dcl_grupo FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
INSERT INTO docente_clases (usuario_id, grado_id, materia_id, grupo_id)
  SELECT dg.usuario_id, dg.grado_id, dm.materia_id, x.grupo_id
  FROM docente_grados dg
  JOIN docente_materias dm ON dm.usuario_id = dg.usuario_id
  JOIN grado_materias gm ON gm.grado_id = dg.grado_id AND gm.materia_id = dm.materia_id
  LEFT JOIN (SELECT dgr.usuario_id, dgr.grupo_id, g.grado_id FROM docente_grupos dgr JOIN grupos g ON g.id = dgr.grupo_id) x
         ON x.usuario_id = dg.usuario_id AND x.grado_id = dg.grado_id
--//
DROP TABLE IF EXISTS docente_grupos
-- @@DOWN
CREATE TABLE IF NOT EXISTS docente_grupos (
  usuario_id INT UNSIGNED NOT NULL,
  grupo_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (usuario_id, grupo_id),
  KEY idx_dgr_grupo (grupo_id),
  CONSTRAINT fk_dgr_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dgr_grupo FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
INSERT IGNORE INTO docente_grupos (usuario_id, grupo_id) SELECT DISTINCT usuario_id, grupo_id FROM docente_clases WHERE grupo_id IS NOT NULL
--//
DROP TABLE IF EXISTS docente_clases
