-- Técnicas de estudio: perfil de aprendizaje (privado), técnica activa, sesiones con nivel de enfoque,
-- y guías de estudio que publican los docentes para sus grupos.
-- @@UP
CREATE TABLE IF NOT EXISTS perfil_aprendizaje (
  usuario_id INT UNSIGNED NOT NULL,
  estilos VARCHAR(120) NULL,
  momento VARCHAR(30) NULL,
  dificultades VARCHAR(200) NULL,
  diagnosticos VARCHAR(300) NULL,
  otros VARCHAR(500) NULL,
  usar_ia TINYINT(1) NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_perfil_ap_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS usuario_tecnica (
  usuario_id INT UNSIGNED NOT NULL,
  tecnica VARCHAR(40) NOT NULL,
  desde DATE NOT NULL,
  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_ut_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS sesiones_enfoque (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  tecnica VARCHAR(40) NOT NULL,
  minutos SMALLINT UNSIGNED NOT NULL,
  enfoque TINYINT UNSIGNED NOT NULL,
  nota VARCHAR(200) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sesion_usuario_fecha (usuario_id, fecha),
  KEY idx_sesion_tecnica (usuario_id, tecnica, fecha),
  CONSTRAINT fk_sesion_enfoque_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_sesion_enfoque CHECK (enfoque >= 1 AND enfoque <= 5 AND minutos >= 1 AND minutos <= 600)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS guias_estudio (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  asignacion_id INT UNSIGNED NOT NULL,
  autor_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_guia_asignacion (asignacion_id, creado_en),
  CONSTRAINT fk_guia_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_guia_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS guias_estudio
--//
DROP TABLE IF EXISTS sesiones_enfoque
--//
DROP TABLE IF EXISTS usuario_tecnica
--//
DROP TABLE IF EXISTS perfil_aprendizaje
