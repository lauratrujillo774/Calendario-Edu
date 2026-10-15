-- Limpieza: EduCal es solo para estudiantes. Se quitan las tablas de lo que ya no existe en la aplicación:
--   docente: docente_clases, docente_grados, docente_materias y la vista v_tareas_profesor
--   IA: consultas_ia
--   pantallas eliminadas: técnicas de estudio (perfil_aprendizaje, usuario_tecnica, sesiones_enfoque), guías de estudio, plan de clases,
--   asistencia, registro futuro (bullets) y colecciones.
-- Antes de aplicarla se hizo un respaldo completo (backend/database/respaldos/). Revertir recrea las tablas VACÍAS (los datos solo están en el respaldo).
-- @@UP
DROP VIEW IF EXISTS v_tareas_profesor
--//
DROP TABLE IF EXISTS coleccion_items
--//
DROP TABLE IF EXISTS colecciones
--//
DROP TABLE IF EXISTS bullets
--//
DROP TABLE IF EXISTS asistencias
--//
DROP TABLE IF EXISTS planes_clase
--//
DROP TABLE IF EXISTS guias_estudio
--//
DROP TABLE IF EXISTS sesiones_enfoque
--//
DROP TABLE IF EXISTS usuario_tecnica
--//
DROP TABLE IF EXISTS perfil_aprendizaje
--//
DROP TABLE IF EXISTS docente_clases
--//
DROP TABLE IF EXISTS docente_grados
--//
DROP TABLE IF EXISTS docente_materias
--//
DROP TABLE IF EXISTS consultas_ia
-- @@DOWN
CREATE TABLE IF NOT EXISTS `bullets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `tipo` enum('tarea','evento','nota','idea') NOT NULL DEFAULT 'tarea',
  `texto` varchar(255) NOT NULL,
  `prioridad` tinyint(1) NOT NULL DEFAULT 0,
  `estado` enum('abierta','hecha','migrada','cancelada') NOT NULL DEFAULT 'abierta',
  `migrada_de` int(10) unsigned DEFAULT NULL,
  `hecho_en` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_bullet_usuario_fecha` (`usuario_id`,`fecha`),
  KEY `idx_bullet_estado` (`usuario_id`,`estado`,`fecha`),
  KEY `fk_bullet_origen` (`migrada_de`),
  CONSTRAINT `fk_bullet_origen` FOREIGN KEY (`migrada_de`) REFERENCES `bullets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_bullet_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `colecciones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `emoji` varchar(16) DEFAULT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#2563EB',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_coleccion_usuario` (`usuario_id`),
  CONSTRAINT `fk_coleccion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `coleccion_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `coleccion_id` int(10) unsigned NOT NULL,
  `texto` varchar(255) NOT NULL,
  `hecho` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_item_coleccion` (`coleccion_id`,`hecho`),
  CONSTRAINT `fk_item_coleccion` FOREIGN KEY (`coleccion_id`) REFERENCES `colecciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `planes_clase` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `asignacion_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `tema` varchar(200) NOT NULL,
  `objetivos` text DEFAULT NULL,
  `actividades` text DEFAULT NULL,
  `recursos` text DEFAULT NULL,
  `evaluacion` text DEFAULT NULL,
  `estado` enum('planeada','dictada') NOT NULL DEFAULT 'planeada',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_plan_asignacion_fecha` (`asignacion_id`,`fecha`),
  CONSTRAINT `fk_plan_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `asistencias` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `asignacion_id` int(10) unsigned NOT NULL,
  `estudiante_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `estado` enum('presente','ausente','tarde','excusa') NOT NULL,
  `nota` varchar(200) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_asistencia` (`asignacion_id`,`estudiante_id`,`fecha`),
  KEY `idx_asistencia_estudiante` (`estudiante_id`,`fecha`),
  CONSTRAINT `fk_asist_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asist_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `perfil_aprendizaje` (
  `usuario_id` int(10) unsigned NOT NULL,
  `estilos` varchar(120) DEFAULT NULL,
  `momento` varchar(30) DEFAULT NULL,
  `dificultades` varchar(200) DEFAULT NULL,
  `diagnosticos` varchar(300) DEFAULT NULL,
  `otros` varchar(500) DEFAULT NULL,
  `usar_ia` tinyint(1) NOT NULL DEFAULT 0,
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`usuario_id`),
  CONSTRAINT `fk_perfil_ap_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `usuario_tecnica` (
  `usuario_id` int(10) unsigned NOT NULL,
  `tecnica` varchar(40) NOT NULL,
  `desde` date NOT NULL,
  PRIMARY KEY (`usuario_id`),
  CONSTRAINT `fk_ut_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `sesiones_enfoque` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `fecha` date NOT NULL,
  `tecnica` varchar(40) NOT NULL,
  `minutos` smallint(5) unsigned NOT NULL,
  `enfoque` tinyint(3) unsigned NOT NULL,
  `nota` varchar(200) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sesion_usuario_fecha` (`usuario_id`,`fecha`),
  KEY `idx_sesion_tecnica` (`usuario_id`,`tecnica`,`fecha`),
  CONSTRAINT `fk_sesion_enfoque_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_sesion_enfoque` CHECK (`enfoque` >= 1 and `enfoque` <= 5 and `minutos` >= 1 and `minutos` <= 600)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `guias_estudio` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `asignacion_id` int(10) unsigned NOT NULL,
  `autor_id` int(10) unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `contenido` text NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_guia_asignacion` (`asignacion_id`,`creado_en`),
  KEY `fk_guia_autor` (`autor_id`),
  CONSTRAINT `fk_guia_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_guia_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `docente_grados` (
  `usuario_id` int(10) unsigned NOT NULL,
  `grado_id` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`usuario_id`,`grado_id`),
  KEY `idx_dg_grado` (`grado_id`),
  CONSTRAINT `fk_dg_grado` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dg_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `docente_materias` (
  `usuario_id` int(10) unsigned NOT NULL,
  `materia_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`usuario_id`,`materia_id`),
  KEY `idx_dm_materia` (`materia_id`),
  CONSTRAINT `fk_dm_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dm_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `docente_clases` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `grado_id` tinyint(3) unsigned NOT NULL,
  `materia_id` int(10) unsigned NOT NULL,
  `grupo_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dcl_usuario` (`usuario_id`),
  KEY `idx_dcl_grado` (`grado_id`),
  KEY `idx_dcl_materia` (`materia_id`),
  KEY `idx_dcl_grupo` (`grupo_id`),
  CONSTRAINT `fk_dcl_grado` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dcl_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dcl_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dcl_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS `consultas_ia` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(10) unsigned NOT NULL,
  `tipo` varchar(30) NOT NULL DEFAULT 'asistente',
  `pregunta` text NOT NULL,
  `respuesta` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ia_usuario` (`usuario_id`),
  KEY `idx_ia_usuario_fecha` (`usuario_id`,`creado_en`),
  CONSTRAINT `fk_ia_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW `v_tareas_profesor` AS select `a`.`profesor_id` AS `profesor_id`,`t`.`id` AS `tarea_id`,`t`.`titulo` AS `titulo`,`t`.`tipo` AS `tipo`,`t`.`fecha_limite` AS `fecha_limite`,`t`.`hora_limite` AS `hora_limite`,`m`.`nombre` AS `materia`,`g`.`nombre` AS `grupo`,count(`e`.`id`) AS `total_estudiantes`,coalesce(sum(`e`.`estado` = 'pendiente'),0) AS `pendientes`,coalesce(sum(`e`.`estado` = 'entregada'),0) AS `entregadas`,`t`.`publicada` AS `publicada`,coalesce(sum(`e`.`estado` = 'calificada'),0) AS `calificadas` from ((((`tareas` `t` join `asignaciones` `a` on(`a`.`id` = `t`.`asignacion_id`)) join `materias` `m` on(`m`.`id` = `a`.`materia_id`)) join `grupos` `g` on(`g`.`id` = `a`.`grupo_id`)) left join `entregas` `e` on(`e`.`tarea_id` = `t`.`id` and `e`.`estudiante_id` in (select `mt`.`estudiante_id` from `matriculas` `mt` where `mt`.`grupo_id` = `a`.`grupo_id`))) group by `t`.`id`,`a`.`profesor_id`,`t`.`titulo`,`t`.`tipo`,`t`.`fecha_limite`,`t`.`hora_limite`,`t`.`publicada`,`m`.`nombre`,`g`.`nombre` order by `t`.`fecha_limite`,`t`.`hora_limite`
