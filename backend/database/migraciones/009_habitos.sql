-- Seguimiento de hábitos (habit tracker del Bullet Journal): un hábito por usuario y un registro por día cumplido.
-- @@UP
CREATE TABLE IF NOT EXISTS habitos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  emoji VARCHAR(16) NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  meta_semanal TINYINT UNSIGNED NOT NULL DEFAULT 7,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_habito_usuario (usuario_id, activo),
  CONSTRAINT fk_habito_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_habito_meta CHECK (meta_semanal >= 1 AND meta_semanal <= 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS habitos_registros (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  habito_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_habito_dia (habito_id, fecha),
  CONSTRAINT fk_registro_habito FOREIGN KEY (habito_id) REFERENCES habitos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS habitos_registros
--//
DROP TABLE IF EXISTS habitos
