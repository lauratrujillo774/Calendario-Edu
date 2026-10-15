-- Notas y pendientes personales (privados) y avisos de profesores/administración.
-- @@UP
CREATE TABLE IF NOT EXISTS notas_personales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NULL,
  fecha DATE NULL,
  color VARCHAR(20) NULL,
  tarea_id INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nota_usuario_fecha (usuario_id, fecha),
  KEY idx_nota_tarea (tarea_id),
  CONSTRAINT fk_nota_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_nota_tarea FOREIGN KEY (tarea_id) REFERENCES tareas (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS pendientes_personales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  fecha_limite DATE NULL,
  prioridad ENUM('baja','media','alta') NOT NULL DEFAULT 'media',
  completado TINYINT(1) NOT NULL DEFAULT 0,
  completado_en DATETIME NULL,
  tarea_id INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pend_usuario (usuario_id, completado, fecha_limite),
  KEY idx_pend_tarea (tarea_id),
  CONSTRAINT fk_pend_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pend_tarea FOREIGN KEY (tarea_id) REFERENCES tareas (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS avisos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  autor_id INT UNSIGNED NOT NULL,
  grupo_id INT UNSIGNED NULL,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_aviso_grupo (grupo_id, creado_en),
  KEY idx_aviso_autor (autor_id),
  CONSTRAINT fk_aviso_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_aviso_grupo FOREIGN KEY (grupo_id) REFERENCES grupos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS avisos
--//
DROP TABLE IF EXISTS pendientes_personales
--//
DROP TABLE IF EXISTS notas_personales
