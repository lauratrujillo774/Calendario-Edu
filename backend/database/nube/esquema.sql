-- EduCal: esquema + datos de referencia para MySQL 8 (generado con npm run exportar-esquema). No contiene datos de personas.
-- @@
DROP TABLE IF EXISTS `asignaciones`
-- @@
CREATE TABLE `asignaciones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `profesor_id` int(10) unsigned NOT NULL,
  `materia_id` int(10) unsigned NOT NULL,
  `grupo_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_asignacion` (`profesor_id`,`materia_id`,`grupo_id`),
  KEY `idx_asig_materia` (`materia_id`),
  KEY `idx_asig_grupo` (`grupo_id`),
  CONSTRAINT `fk_asig_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asig_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asig_profesor` FOREIGN KEY (`profesor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `avisos`
-- @@
CREATE TABLE `avisos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `autor_id` int(10) unsigned NOT NULL,
  `grupo_id` int(10) unsigned DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `contenido` text NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_aviso_grupo` (`grupo_id`,`creado_en`),
  KEY `idx_aviso_autor` (`autor_id`),
  CONSTRAINT `fk_aviso_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_aviso_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `diario_dias`
-- @@
CREATE TABLE `diario_dias` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `animo` tinyint(3) unsigned DEFAULT NULL,
  `emociones` varchar(200) DEFAULT NULL,
  `sentir` text DEFAULT NULL,
  `gratitud` varchar(500) DEFAULT NULL,
  `bien` text DEFAULT NULL,
  `mejorar` text DEFAULT NULL,
  `energia` tinyint(3) unsigned DEFAULT NULL,
  `reflexion` text DEFAULT NULL,
  `memo` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_diario_dia` (`usuario_id`,`fecha`),
  CONSTRAINT `fk_diario_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_diario_animo` CHECK (`animo` is null or `animo` >= 1 and `animo` <= 5),
  CONSTRAINT `ck_diario_energia` CHECK (`energia` is null or `energia` >= 1 and `energia` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `dias_estudio`
-- @@
CREATE TABLE `dias_estudio` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `minutos` smallint(5) unsigned DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dia_estudio` (`usuario_id`,`fecha`),
  CONSTRAINT `fk_estudio_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_estudio_minutos` CHECK (`minutos` is null or `minutos` <= 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `entregas`
-- @@
CREATE TABLE `entregas` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tarea_id` int(10) unsigned NOT NULL,
  `estudiante_id` int(10) unsigned NOT NULL,
  `estado` enum('pendiente','entregada','calificada') NOT NULL DEFAULT 'pendiente',
  `fecha_entrega` datetime DEFAULT NULL,
  `comentario` varchar(500) DEFAULT NULL,
  `archivo_url` varchar(255) DEFAULT NULL,
  `archivo_nombre` varchar(255) DEFAULT NULL,
  `calificacion` decimal(3,1) DEFAULT NULL,
  `comentario_profesor` varchar(1000) DEFAULT NULL,
  `calificado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_entrega` (`tarea_id`,`estudiante_id`),
  KEY `idx_entrega_estudiante` (`estudiante_id`,`estado`),
  CONSTRAINT `fk_entrega_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_entrega_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_entrega_nota` CHECK (`calificacion` is null or `calificacion` >= 0 and `calificacion` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `estudiante_materias`
-- @@
CREATE TABLE `estudiante_materias` (
  `usuario_id` int(10) unsigned NOT NULL,
  `materia_id` int(10) unsigned NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`usuario_id`,`materia_id`),
  KEY `idx_em_materia` (`materia_id`),
  CONSTRAINT `fk_em_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_em_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `eventos`
-- @@
CREATE TABLE `eventos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creado_por` int(10) unsigned NOT NULL,
  `grupo_id` int(10) unsigned DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_eventos_fecha` (`fecha`),
  KEY `fk_eventos_usuario` (`creado_por`),
  KEY `fk_eventos_grupo` (`grupo_id`),
  CONSTRAINT `fk_eventos_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_eventos_usuario` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `grados`
-- @@
CREATE TABLE `grados` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  `orden` tinyint(3) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_grado_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `grado_materias`
-- @@
CREATE TABLE `grado_materias` (
  `grado_id` tinyint(3) unsigned NOT NULL,
  `materia_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`grado_id`,`materia_id`),
  KEY `idx_gm_materia` (`materia_id`),
  CONSTRAINT `fk_gm_grado` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_gm_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `grupos`
-- @@
CREATE TABLE `grupos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  `grado_id` tinyint(3) unsigned DEFAULT NULL,
  `anio` year(4) NOT NULL DEFAULT 2026,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_grupos_nombre_anio` (`nombre`,`anio`),
  KEY `fk_grupo_grado` (`grado_id`),
  CONSTRAINT `fk_grupo_grado` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `habitos`
-- @@
CREATE TABLE `habitos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `emoji` varchar(16) DEFAULT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#2563EB',
  `meta_semanal` tinyint(3) unsigned NOT NULL DEFAULT 7,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_habito_usuario` (`usuario_id`,`activo`),
  CONSTRAINT `fk_habito_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_habito_meta` CHECK (`meta_semanal` >= 1 and `meta_semanal` <= 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `habitos_registros`
-- @@
CREATE TABLE `habitos_registros` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `habito_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_habito_dia` (`habito_id`,`fecha`),
  CONSTRAINT `fk_registro_habito` FOREIGN KEY (`habito_id`) REFERENCES `habitos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `horario_entradas`
-- @@
CREATE TABLE `horario_entradas` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `texto` varchar(150) NOT NULL,
  `cumplido` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_horario_dia` (`usuario_id`,`fecha`,`hora`),
  CONSTRAINT `fk_horario_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `materias`
-- @@
CREATE TABLE `materias` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `color` char(7) NOT NULL DEFAULT '#2563EB',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_materias_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `matriculas`
-- @@
CREATE TABLE `matriculas` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `estudiante_id` int(10) unsigned NOT NULL,
  `grupo_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_matricula` (`estudiante_id`,`grupo_id`),
  KEY `idx_matricula_grupo` (`grupo_id`),
  CONSTRAINT `fk_mat_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mat_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `migraciones`
-- @@
CREATE TABLE `migraciones` (
  `nombre` varchar(150) NOT NULL,
  `aplicada_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `notas_personales`
-- @@
CREATE TABLE `notas_personales` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `contenido` text DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `tarea_id` int(10) unsigned DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_nota_usuario_fecha` (`usuario_id`,`fecha`),
  KEY `idx_nota_tarea` (`tarea_id`),
  CONSTRAINT `fk_nota_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_nota_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `notificaciones`
-- @@
CREATE TABLE `notificaciones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `clave` varchar(120) NOT NULL,
  `titulo` varchar(160) NOT NULL,
  `mensaje` varchar(400) DEFAULT NULL,
  `ruta` varchar(80) DEFAULT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `correo_enviado` tinyint(1) NOT NULL DEFAULT 0,
  `intentos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `creada_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notificacion` (`usuario_id`,`clave`),
  KEY `idx_notif_usuario` (`usuario_id`,`leida`,`creada_en`),
  KEY `idx_notif_correo` (`correo_enviado`,`creada_en`),
  CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `pendientes_personales`
-- @@
CREATE TABLE `pendientes_personales` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('tarea','examen','evento') NOT NULL DEFAULT 'tarea',
  `fecha_limite` date DEFAULT NULL,
  `hora` time DEFAULT NULL,
  `prioridad` enum('baja','media','alta') NOT NULL DEFAULT 'media',
  `completado` tinyint(1) NOT NULL DEFAULT 0,
  `completado_en` datetime DEFAULT NULL,
  `tarea_id` int(10) unsigned DEFAULT NULL,
  `materia_id` int(10) unsigned DEFAULT NULL,
  `nota` decimal(3,1) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pend_usuario` (`usuario_id`,`completado`,`fecha_limite`),
  KEY `idx_pend_tarea` (`tarea_id`),
  KEY `fk_pend_materia` (`materia_id`),
  CONSTRAINT `fk_pend_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pend_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pend_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_pend_nota` CHECK (`nota` is null or `nota` >= 0 and `nota` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `recordatorios`
-- @@
CREATE TABLE `recordatorios` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `tarea_id` int(10) unsigned DEFAULT NULL,
  `pendiente_id` int(10) unsigned DEFAULT NULL,
  `texto` varchar(200) DEFAULT NULL,
  `avisar_en` datetime NOT NULL,
  `enviado` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_record_tarea` (`usuario_id`,`tarea_id`,`avisar_en`),
  UNIQUE KEY `uq_record_pendiente` (`usuario_id`,`pendiente_id`,`avisar_en`),
  KEY `idx_record_aviso` (`enviado`,`avisar_en`),
  KEY `fk_record_tarea` (`tarea_id`),
  KEY `fk_record_usuario` (`usuario_id`),
  KEY `fk_record_pendiente` (`pendiente_id`),
  CONSTRAINT `fk_record_pendiente` FOREIGN KEY (`pendiente_id`) REFERENCES `pendientes_personales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_record_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_record_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `roles`
-- @@
CREATE TABLE `roles` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `sesiones`
-- @@
CREATE TABLE `sesiones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) NOT NULL,
  `usuario_id` int(10) unsigned NOT NULL,
  `csrf` char(48) NOT NULL,
  `creada_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `expira_en` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sesion_token` (`token_hash`),
  KEY `idx_sesion_expira` (`expira_en`),
  KEY `idx_sesion_usuario` (`usuario_id`),
  CONSTRAINT `fk_sesion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `tareas`
-- @@
CREATE TABLE `tareas` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `asignacion_id` int(10) unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('tarea','trabajo','examen','proyecto') NOT NULL DEFAULT 'tarea',
  `prioridad` enum('baja','media','alta') NOT NULL DEFAULT 'media',
  `fecha_limite` date NOT NULL,
  `hora_limite` time NOT NULL DEFAULT '23:59:00',
  `archivo_url` varchar(255) DEFAULT NULL,
  `publicada` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tareas_asignacion` (`asignacion_id`),
  KEY `idx_tareas_fecha` (`fecha_limite`),
  KEY `idx_tareas_publicada` (`publicada`,`fecha_limite`),
  CONSTRAINT `fk_tareas_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
DROP TABLE IF EXISTS `usuarios`
-- @@
CREATE TABLE `usuarios` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `rol_id` tinyint(3) unsigned NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `nombres` varchar(60) DEFAULT NULL,
  `apellidos` varchar(60) DEFAULT NULL,
  `correo` varchar(120) NOT NULL,
  `identificacion` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `grado_id` tinyint(3) unsigned DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `contrasena_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `notif_correo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  UNIQUE KEY `uq_usuarios_identificacion` (`identificacion`),
  KEY `idx_usuarios_rol` (`rol_id`),
  KEY `fk_usuario_grado` (`grado_id`),
  CONSTRAINT `fk_usuario_grado` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@
INSERT INTO `roles` (`id`, `nombre`) VALUES (1, 'admin')
-- @@
INSERT INTO `roles` (`id`, `nombre`) VALUES (3, 'estudiante')
-- @@
INSERT INTO `roles` (`id`, `nombre`) VALUES (2, 'profesor')
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (1, 'Transición', 0)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (2, '1°', 1)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (3, '2°', 2)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (4, '3°', 3)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (5, '4°', 4)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (6, '5°', 5)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (7, '6°', 6)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (8, '7°', 7)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (9, '8°', 8)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (10, '9°', 9)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (11, '10°', 10)
-- @@
INSERT INTO `grados` (`id`, `nombre`, `orden`) VALUES (12, '11°', 11)
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('001_sesiones.sql', '2026-10-10 21:25:51')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('002_tareas_publicacion_y_retroalimentacion.sql', '2026-10-10 21:25:51')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('003_notas_pendientes_avisos.sql', '2026-10-10 21:25:52')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('004_recordatorios.sql', '2026-10-10 21:25:52')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('005_vistas_y_triggers.sql', '2026-10-10 21:25:52')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('006_pendientes_tipo_hora.sql', '2026-10-10 22:13:58')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('007_dias_estudio.sql', '2026-10-10 22:13:58')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('008_diario_bullets.sql', '2026-10-10 22:35:38')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('009_habitos.sql', '2026-10-10 22:35:38')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('010_colecciones.sql', '2026-10-10 22:35:38')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('011_docente_planes_asistencia.sql', '2026-10-10 22:35:38')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('012_ia_consultas.sql', '2026-10-10 22:35:38')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('013_grados_pensum_perfiles.sql', '2026-10-11 10:42:52')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('014_notificaciones.sql', '2026-10-11 10:42:52')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('015_pendientes_nota_recordatorio_texto.sql', '2026-10-11 10:42:52')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('016_tecnicas_guias.sql', '2026-10-11 10:42:52')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('017_diario_personal.sql', '2026-10-11 10:42:53')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('018_nombres_apellidos.sql', '2026-10-11 12:29:59')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('019_plan_de_estudios_colombia.sql', '2026-10-11 12:41:42')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('020_docente_grupos.sql', '2026-10-11 12:54:02')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('021_docente_clases.sql', '2026-10-11 13:23:44')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('022_horario_entradas.sql', '2026-10-11 13:47:20')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('023_estudiante_materias.sql', '2026-10-14 19:13:11')
-- @@
INSERT INTO `migraciones` (`nombre`, `aplicada_en`) VALUES ('024_quitar_docente_ia_y_funciones_eliminadas.sql', '2026-10-15 07:07:28')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (1, 'Matemáticas', '#2563EB')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (2, 'Historia', '#F59E0B')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (3, 'Inglés', '#22C55E')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (4, 'Programación', '#8B5CF6')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (5, 'Química', '#EF4444')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (110, 'Dimensión Cognitiva', '#2563EB')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (111, 'Dimensión Comunicativa', '#0EA5E9')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (112, 'Dimensión Corporal', '#10B981')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (113, 'Dimensión Socioafectiva', '#EC4899')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (114, 'Dimensión Estética', '#8B5CF6')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (115, 'Dimensión Espiritual y Ética', '#6366F1')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (116, 'Lengua Castellana', '#EF4444')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (117, 'Ciencias Naturales y Educación Ambiental', '#84CC16')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (118, 'Ciencias Sociales', '#EAB308')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (119, 'Educación Artística y Cultural', '#8B5CF6')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (120, 'Educación Física, Recreación y Deporte', '#F97316')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (121, 'Educación Ética y en Valores Humanos', '#EC4899')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (122, 'Educación Religiosa', '#6366F1')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (123, 'Tecnología e Informática', '#14B8A6')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (124, 'Emprendimiento', '#0EA5E9')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (125, 'Biología', '#84CC16')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (126, 'Física', '#64748B')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (127, 'Filosofía', '#6366F1')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (128, 'Ciencias Económicas y Políticas', '#EAB308')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (331, 'español', '#14B8A6')
-- @@
INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES (332, 'ed fisica', '#EC4899')
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 125)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 125)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 128)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 128)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 117)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 118)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (1, 110)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (1, 111)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (1, 112)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (1, 115)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (1, 114)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (1, 113)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 119)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 121)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 120)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 122)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 124)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 124)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 124)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 124)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 124)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 127)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 127)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 126)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 126)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 2)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 3)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 116)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 1)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 4)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 5)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 5)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (2, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (3, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (4, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (5, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (6, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (7, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (8, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (9, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (11, 123)
-- @@
INSERT INTO `grado_materias` (`grado_id`, `materia_id`) VALUES (12, 123)
-- @@
DROP TRIGGER IF EXISTS `trg_matricula_crea_entregas`
-- @@
CREATE TRIGGER trg_matricula_crea_entregas
AFTER INSERT ON matriculas
FOR EACH ROW
BEGIN
  INSERT IGNORE INTO entregas (tarea_id, estudiante_id)
  SELECT t.id, NEW.estudiante_id
  FROM tareas t
  JOIN asignaciones a ON a.id = t.asignacion_id
  WHERE a.grupo_id = NEW.grupo_id
    AND t.fecha_limite >= CURDATE();
END
-- @@
DROP TRIGGER IF EXISTS `trg_tarea_crea_entregas`
-- @@
CREATE TRIGGER trg_tarea_crea_entregas AFTER INSERT ON tareas FOR EACH ROW
BEGIN
  INSERT IGNORE INTO entregas (tarea_id, estudiante_id)
  SELECT NEW.id, mt.estudiante_id
  FROM asignaciones a
  JOIN matriculas mt ON mt.grupo_id = a.grupo_id
  WHERE a.id = NEW.asignacion_id;
END
-- @@
DROP TRIGGER IF EXISTS `trg_tarea_no_cambia_asignacion`
-- @@
CREATE TRIGGER trg_tarea_no_cambia_asignacion BEFORE UPDATE ON tareas FOR EACH ROW
BEGIN
  IF NEW.asignacion_id <> OLD.asignacion_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede cambiar la materia/grupo de una tarea ya creada';
  END IF;
END
-- @@
DROP VIEW IF EXISTS `v_tareas_estudiante`
-- @@
CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW `v_tareas_estudiante` AS select `e`.`estudiante_id` AS `estudiante_id`,`t`.`id` AS `tarea_id`,`t`.`titulo` AS `titulo`,`t`.`descripcion` AS `descripcion`,`t`.`tipo` AS `tipo`,`t`.`prioridad` AS `prioridad`,`t`.`fecha_limite` AS `fecha_limite`,`t`.`hora_limite` AS `hora_limite`,`m`.`nombre` AS `materia`,`m`.`color` AS `color`,`g`.`nombre` AS `grupo`,`p`.`nombre` AS `profesor`,`e`.`estado` AS `estado`,`e`.`calificacion` AS `calificacion`,`e`.`id` AS `entrega_id`,`e`.`fecha_entrega` AS `fecha_entrega`,`e`.`comentario_profesor` AS `comentario_profesor`,`a`.`id` AS `asignacion_id`,`m`.`id` AS `materia_id`,`g`.`id` AS `grupo_id` from ((((((`entregas` `e` join `tareas` `t` on(`t`.`id` = `e`.`tarea_id` and `t`.`publicada` = 1)) join `asignaciones` `a` on(`a`.`id` = `t`.`asignacion_id`)) join `matriculas` `mt` on(`mt`.`estudiante_id` = `e`.`estudiante_id` and `mt`.`grupo_id` = `a`.`grupo_id`)) join `materias` `m` on(`m`.`id` = `a`.`materia_id`)) join `grupos` `g` on(`g`.`id` = `a`.`grupo_id`)) join `usuarios` `p` on(`p`.`id` = `a`.`profesor_id`))
-- @@
DROP VIEW IF EXISTS `v_estadisticas_estudiante`
-- @@
CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW `v_estadisticas_estudiante` AS select `v_tareas_estudiante`.`estudiante_id` AS `estudiante_id`,count(0) AS `total`,sum(`v_tareas_estudiante`.`estado` = 'pendiente') AS `pendientes`,sum(`v_tareas_estudiante`.`estado` <> 'pendiente') AS `completadas`,round(sum(`v_tareas_estudiante`.`estado` <> 'pendiente') * 100 / count(0),0) AS `progreso`,sum(`v_tareas_estudiante`.`estado` = 'entregada') AS `entregadas`,sum(`v_tareas_estudiante`.`estado` = 'calificada') AS `calificadas` from `v_tareas_estudiante` group by `v_tareas_estudiante`.`estudiante_id`
-- @@
DROP VIEW IF EXISTS `v_pendientes_estudiante`
-- @@
CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW `v_pendientes_estudiante` AS select `v_tareas_estudiante`.`estudiante_id` AS `estudiante_id`,`v_tareas_estudiante`.`tarea_id` AS `tarea_id`,`v_tareas_estudiante`.`titulo` AS `titulo`,`v_tareas_estudiante`.`descripcion` AS `descripcion`,`v_tareas_estudiante`.`tipo` AS `tipo`,`v_tareas_estudiante`.`prioridad` AS `prioridad`,`v_tareas_estudiante`.`fecha_limite` AS `fecha_limite`,`v_tareas_estudiante`.`hora_limite` AS `hora_limite`,`v_tareas_estudiante`.`materia` AS `materia`,`v_tareas_estudiante`.`color` AS `color`,`v_tareas_estudiante`.`grupo` AS `grupo`,`v_tareas_estudiante`.`profesor` AS `profesor`,`v_tareas_estudiante`.`estado` AS `estado`,`v_tareas_estudiante`.`calificacion` AS `calificacion` from `v_tareas_estudiante` where `v_tareas_estudiante`.`estado` = 'pendiente' order by `v_tareas_estudiante`.`fecha_limite`,`v_tareas_estudiante`.`hora_limite`
