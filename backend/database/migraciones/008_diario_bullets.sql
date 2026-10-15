-- Diario estilo Bullet Journal + página diaria tipo Hobonichi: ánimo, gratitud, reflexión, memo y "rapid logging" (bullets).
-- @@UP
CREATE TABLE IF NOT EXISTS diario_dias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  animo TINYINT UNSIGNED NULL,
  gratitud VARCHAR(500) NULL,
  reflexion TEXT NULL,
  memo TEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_diario_dia (usuario_id, fecha),
  CONSTRAINT fk_diario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_diario_animo CHECK (animo IS NULL OR (animo >= 1 AND animo <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS bullets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  tipo ENUM('tarea','evento','nota','idea') NOT NULL DEFAULT 'tarea',
  texto VARCHAR(255) NOT NULL,
  prioridad TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM('abierta','hecha','migrada','cancelada') NOT NULL DEFAULT 'abierta',
  migrada_de INT UNSIGNED NULL,
  hecho_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bullet_usuario_fecha (usuario_id, fecha),
  KEY idx_bullet_estado (usuario_id, estado, fecha),
  CONSTRAINT fk_bullet_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bullet_origen FOREIGN KEY (migrada_de) REFERENCES bullets (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS bullets
--//
DROP TABLE IF EXISTS diario_dias
