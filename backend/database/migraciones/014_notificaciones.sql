-- Notificaciones de la campanita (y base para los correos): una fila por aviso, sin repetirse (clave única por usuario).
-- @@UP
CREATE TABLE IF NOT EXISTS notificaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  clave VARCHAR(120) NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  mensaje VARCHAR(400) NULL,
  ruta VARCHAR(80) NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  correo_enviado TINYINT(1) NOT NULL DEFAULT 0,
  intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notificacion (usuario_id, clave),
  KEY idx_notif_usuario (usuario_id, leida, creada_en),
  KEY idx_notif_correo (correo_enviado, creada_en),
  CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS notificaciones
