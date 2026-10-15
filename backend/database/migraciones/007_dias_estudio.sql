-- Días de estudio que cada usuario registra (alimenta "Días de estudio esta semana"). Un registro por usuario y día.
-- @@UP
CREATE TABLE IF NOT EXISTS dias_estudio (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  minutos SMALLINT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dia_estudio (usuario_id, fecha),
  CONSTRAINT fk_estudio_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_estudio_minutos CHECK (minutos IS NULL OR minutos <= 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS dias_estudio
