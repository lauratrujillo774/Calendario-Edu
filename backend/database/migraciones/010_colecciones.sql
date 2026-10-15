-- Colecciones (Bullet Journal): listas temáticas con casillas (metas del semestre, lecturas, ideas de clase, proyectos…).
-- @@UP
CREATE TABLE IF NOT EXISTS colecciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(100) NOT NULL,
  emoji VARCHAR(16) NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_coleccion_usuario (usuario_id),
  CONSTRAINT fk_coleccion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS coleccion_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  coleccion_id INT UNSIGNED NOT NULL,
  texto VARCHAR(255) NOT NULL,
  hecho TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_coleccion (coleccion_id, hecho),
  CONSTRAINT fk_item_coleccion FOREIGN KEY (coleccion_id) REFERENCES colecciones (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS coleccion_items
--//
DROP TABLE IF EXISTS colecciones
