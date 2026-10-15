-- Grupos concretos que dicta un docente (por ejemplo 11-1 y 11-2). Si un docente no tiene ninguno marcado en un grado, dicta todos los grupos de ese grado.
-- @@UP
CREATE TABLE IF NOT EXISTS docente_grupos (
  usuario_id INT UNSIGNED NOT NULL,
  grupo_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (usuario_id, grupo_id),
  KEY idx_dgr_grupo (grupo_id),
  CONSTRAINT fk_dgr_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dgr_grupo FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS docente_grupos
