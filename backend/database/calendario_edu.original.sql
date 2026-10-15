-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 11-10-2026 a las 04:13:58
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `calendario_edu`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignaciones`
--

CREATE TABLE `asignaciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `profesor_id` int(10) UNSIGNED NOT NULL,
  `materia_id` int(10) UNSIGNED NOT NULL,
  `grupo_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `asignaciones`
--

INSERT INTO `asignaciones` (`id`, `profesor_id`, `materia_id`, `grupo_id`) VALUES
(1, 2, 1, 1),
(2, 2, 4, 1),
(3, 3, 2, 1),
(4, 3, 3, 2),
(5, 3, 5, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consultas_ia`
--

CREATE TABLE `consultas_ia` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `pregunta` text NOT NULL,
  `respuesta` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `consultas_ia`
--

INSERT INTO `consultas_ia` (`id`, `usuario_id`, `pregunta`, `respuesta`, `creado_en`) VALUES
(1, 4, 'Tengo examen de matemáticas el viernes, ¿cómo organizo mi estudio?', 'Organiza tus tareas por prioridad, revisa las fechas de entrega y dedica tiempo de estudio cada día.', '2026-10-11 01:26:45');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `entregas`
--

CREATE TABLE `entregas` (
  `id` int(10) UNSIGNED NOT NULL,
  `tarea_id` int(10) UNSIGNED NOT NULL,
  `estudiante_id` int(10) UNSIGNED NOT NULL,
  `estado` enum('pendiente','entregada','calificada') NOT NULL DEFAULT 'pendiente',
  `fecha_entrega` datetime DEFAULT NULL,
  `comentario` varchar(500) DEFAULT NULL,
  `archivo_url` varchar(255) DEFAULT NULL,
  `calificacion` decimal(3,1) DEFAULT NULL
) ;

--
-- Volcado de datos para la tabla `entregas`
--

INSERT INTO `entregas` (`id`, `tarea_id`, `estudiante_id`, `estado`, `fecha_entrega`, `comentario`, `archivo_url`, `calificacion`) VALUES
(1, 1, 4, 'calificada', '2026-10-10 20:26:45', NULL, NULL, 4.5),
(2, 1, 5, 'pendiente', NULL, NULL, NULL, NULL),
(4, 2, 4, 'pendiente', NULL, NULL, NULL, NULL),
(5, 2, 5, 'pendiente', NULL, NULL, NULL, NULL),
(7, 3, 4, 'pendiente', NULL, NULL, NULL, NULL),
(8, 3, 5, 'pendiente', NULL, NULL, NULL, NULL),
(10, 4, 6, 'pendiente', NULL, NULL, NULL, NULL),
(11, 5, 6, 'pendiente', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `eventos`
--

CREATE TABLE `eventos` (
  `id` int(10) UNSIGNED NOT NULL,
  `creado_por` int(10) UNSIGNED NOT NULL,
  `grupo_id` int(10) UNSIGNED DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `eventos`
--

INSERT INTO `eventos` (`id`, `creado_por`, `grupo_id`, `titulo`, `descripcion`, `fecha`, `hora`) VALUES
(1, 1, NULL, 'Izada de bandera', 'Acto cívico institucional.', '2026-10-16', '07:00:00'),
(2, 2, 1, 'Entrega de notas P3', 'Reunión con padres de 10-A.', '2026-10-28', '14:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupos`
--

CREATE TABLE `grupos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(20) NOT NULL,
  `anio` year(4) NOT NULL DEFAULT 2026
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `grupos`
--

INSERT INTO `grupos` (`id`, `nombre`, `anio`) VALUES
(1, '10-A', '2026'),
(2, '11-A', '2026');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materias`
--

CREATE TABLE `materias` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `color` char(7) NOT NULL DEFAULT '#2563EB'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `materias`
--

INSERT INTO `materias` (`id`, `nombre`, `color`) VALUES
(1, 'Matemáticas', '#2563EB'),
(2, 'Historia', '#F59E0B'),
(3, 'Inglés', '#22C55E'),
(4, 'Programación', '#8B5CF6'),
(5, 'Química', '#EF4444');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `matriculas`
--

CREATE TABLE `matriculas` (
  `id` int(10) UNSIGNED NOT NULL,
  `estudiante_id` int(10) UNSIGNED NOT NULL,
  `grupo_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `matriculas`
--

INSERT INTO `matriculas` (`id`, `estudiante_id`, `grupo_id`) VALUES
(1, 4, 1),
(2, 5, 1),
(3, 6, 2);

--
-- Disparadores `matriculas`
--
DELIMITER $$
CREATE TRIGGER `trg_matricula_crea_entregas` AFTER INSERT ON `matriculas` FOR EACH ROW BEGIN
  INSERT IGNORE INTO entregas (tarea_id, estudiante_id)
  SELECT t.id, NEW.estudiante_id
  FROM tareas t
  JOIN asignaciones a ON a.id = t.asignacion_id
  WHERE a.grupo_id = NEW.grupo_id
    AND t.fecha_limite >= CURDATE();
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recordatorios`
--

CREATE TABLE `recordatorios` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `tarea_id` int(10) UNSIGNED NOT NULL,
  `avisar_en` datetime NOT NULL,
  `enviado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `recordatorios`
--

INSERT INTO `recordatorios` (`id`, `usuario_id`, `tarea_id`, `avisar_en`, `enviado`) VALUES
(1, 4, 2, '2026-10-29 08:00:00', 0),
(2, 5, 4, '2026-10-17 18:00:00', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`) VALUES
(1, 'admin'),
(3, 'estudiante'),
(2, 'profesor');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tareas`
--

CREATE TABLE `tareas` (
  `id` int(10) UNSIGNED NOT NULL,
  `asignacion_id` int(10) UNSIGNED NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('tarea','trabajo','examen','proyecto') NOT NULL DEFAULT 'tarea',
  `prioridad` enum('baja','media','alta') NOT NULL DEFAULT 'media',
  `fecha_limite` date NOT NULL,
  `hora_limite` time NOT NULL DEFAULT '23:59:00',
  `archivo_url` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tareas`
--

INSERT INTO `tareas` (`id`, `asignacion_id`, `titulo`, `descripcion`, `tipo`, `prioridad`, `fecha_limite`, `hora_limite`, `archivo_url`, `creado_en`) VALUES
(1, 1, 'Taller de ecuaciones', 'Resolver los ejercicios 1 al 15 de la guía.', 'tarea', 'media', '2026-10-20', '23:59:00', NULL, '2026-10-11 01:26:45'),
(2, 2, 'Proyecto calendario web', 'Entregar HTML, CSS y JS del calendario.', 'proyecto', 'alta', '2026-10-30', '18:00:00', NULL, '2026-10-11 01:26:45'),
(3, 3, 'Ensayo Independencia', 'Ensayo de una página sobre la independencia.', 'trabajo', 'media', '2026-10-22', '12:00:00', NULL, '2026-10-11 01:26:45'),
(4, 4, 'Quiz de vocabulario', 'Unidad 5: vocabulario y verbos.', 'examen', 'alta', '2026-10-18', '08:00:00', NULL, '2026-10-11 01:26:45'),
(5, 5, 'Informe de laboratorio', 'Informe de la práctica de reacciones.', 'trabajo', 'baja', '2026-10-25', '23:59:00', NULL, '2026-10-11 01:26:45');

--
-- Disparadores `tareas`
--
DELIMITER $$
CREATE TRIGGER `trg_tarea_crea_entregas` AFTER INSERT ON `tareas` FOR EACH ROW BEGIN
  INSERT INTO entregas (tarea_id, estudiante_id)
  SELECT NEW.id, mt.estudiante_id
  FROM asignaciones a
  JOIN matriculas mt ON mt.grupo_id = a.grupo_id
  WHERE a.id = NEW.asignacion_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `rol_id` tinyint(3) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(120) NOT NULL,
  `contrasena_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `rol_id`, `nombre`, `correo`, `contrasena_hash`, `activo`, `creado_en`) VALUES
(1, 1, 'Administrador', 'admin@santaelena.edu.co', 'REEMPLAZAR_CON_HASH', 1, '2026-10-11 01:26:45'),
(2, 2, 'Profe Carlos Gómez', 'carlos.gomez@santaelena.edu.co', 'REEMPLAZAR_CON_HASH', 1, '2026-10-11 01:26:45'),
(3, 2, 'Profe Marta Ruiz', 'marta.ruiz@santaelena.edu.co', 'REEMPLAZAR_CON_HASH', 1, '2026-10-11 01:26:45'),
(4, 3, 'Jacobo Atehortúa', 'jacobo@santaelena.edu.co', 'REEMPLAZAR_CON_HASH', 1, '2026-10-11 01:26:45'),
(5, 3, 'Laura Trujillo', 'laura@santaelena.edu.co', 'REEMPLAZAR_CON_HASH', 1, '2026-10-11 01:26:45'),
(6, 3, 'Andrés Pérez', 'andres@santaelena.edu.co', 'REEMPLAZAR_CON_HASH', 1, '2026-10-11 01:26:45'),
(9, 3, 'ana maria montes correa', 'paginasvarias774@gmail.com', '5f92ac4f16b0e7e2f17507972c8fd5d6:cc85b8ec8e77c7f7cf5c144bda29cb5e9f69db34b5580e1c559c4c04e44c07b37b0b128541d724630925f7a0380d4fc270c0e42a2bd1437b834a68699d3c3bc5', 1, '2026-10-11 02:03:10');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_estadisticas_estudiante`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_estadisticas_estudiante` (
`estudiante_id` int(10) unsigned
,`total` bigint(21)
,`pendientes` decimal(23,0)
,`completadas` decimal(23,0)
,`progreso` decimal(27,0)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_pendientes_estudiante`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_pendientes_estudiante` (
`estudiante_id` int(10) unsigned
,`tarea_id` int(10) unsigned
,`titulo` varchar(150)
,`descripcion` text
,`tipo` enum('tarea','trabajo','examen','proyecto')
,`prioridad` enum('baja','media','alta')
,`fecha_limite` date
,`hora_limite` time
,`materia` varchar(80)
,`color` char(7)
,`grupo` varchar(20)
,`profesor` varchar(100)
,`estado` enum('pendiente','entregada','calificada')
,`calificacion` decimal(3,1)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_tareas_estudiante`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_tareas_estudiante` (
`estudiante_id` int(10) unsigned
,`tarea_id` int(10) unsigned
,`titulo` varchar(150)
,`descripcion` text
,`tipo` enum('tarea','trabajo','examen','proyecto')
,`prioridad` enum('baja','media','alta')
,`fecha_limite` date
,`hora_limite` time
,`materia` varchar(80)
,`color` char(7)
,`grupo` varchar(20)
,`profesor` varchar(100)
,`estado` enum('pendiente','entregada','calificada')
,`calificacion` decimal(3,1)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_tareas_profesor`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_tareas_profesor` (
`profesor_id` int(10) unsigned
,`tarea_id` int(10) unsigned
,`titulo` varchar(150)
,`tipo` enum('tarea','trabajo','examen','proyecto')
,`fecha_limite` date
,`hora_limite` time
,`materia` varchar(80)
,`grupo` varchar(20)
,`total_estudiantes` bigint(21)
,`pendientes` decimal(23,0)
,`entregadas` decimal(23,0)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `v_estadisticas_estudiante`
--
DROP TABLE IF EXISTS `v_estadisticas_estudiante`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_estadisticas_estudiante`  AS SELECT `entregas`.`estudiante_id` AS `estudiante_id`, count(0) AS `total`, sum(`entregas`.`estado` = 'pendiente') AS `pendientes`, sum(`entregas`.`estado` <> 'pendiente') AS `completadas`, round(sum(`entregas`.`estado` <> 'pendiente') * 100 / count(0),0) AS `progreso` FROM `entregas` GROUP BY `entregas`.`estudiante_id` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_pendientes_estudiante`
--
DROP TABLE IF EXISTS `v_pendientes_estudiante`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_pendientes_estudiante`  AS SELECT `v_tareas_estudiante`.`estudiante_id` AS `estudiante_id`, `v_tareas_estudiante`.`tarea_id` AS `tarea_id`, `v_tareas_estudiante`.`titulo` AS `titulo`, `v_tareas_estudiante`.`descripcion` AS `descripcion`, `v_tareas_estudiante`.`tipo` AS `tipo`, `v_tareas_estudiante`.`prioridad` AS `prioridad`, `v_tareas_estudiante`.`fecha_limite` AS `fecha_limite`, `v_tareas_estudiante`.`hora_limite` AS `hora_limite`, `v_tareas_estudiante`.`materia` AS `materia`, `v_tareas_estudiante`.`color` AS `color`, `v_tareas_estudiante`.`grupo` AS `grupo`, `v_tareas_estudiante`.`profesor` AS `profesor`, `v_tareas_estudiante`.`estado` AS `estado`, `v_tareas_estudiante`.`calificacion` AS `calificacion` FROM `v_tareas_estudiante` WHERE `v_tareas_estudiante`.`estado` = 'pendiente' ORDER BY `v_tareas_estudiante`.`fecha_limite` ASC, `v_tareas_estudiante`.`hora_limite` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_tareas_estudiante`
--
DROP TABLE IF EXISTS `v_tareas_estudiante`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_tareas_estudiante`  AS SELECT `e`.`estudiante_id` AS `estudiante_id`, `t`.`id` AS `tarea_id`, `t`.`titulo` AS `titulo`, `t`.`descripcion` AS `descripcion`, `t`.`tipo` AS `tipo`, `t`.`prioridad` AS `prioridad`, `t`.`fecha_limite` AS `fecha_limite`, `t`.`hora_limite` AS `hora_limite`, `m`.`nombre` AS `materia`, `m`.`color` AS `color`, `g`.`nombre` AS `grupo`, `p`.`nombre` AS `profesor`, `e`.`estado` AS `estado`, `e`.`calificacion` AS `calificacion` FROM (((((`entregas` `e` join `tareas` `t` on(`t`.`id` = `e`.`tarea_id`)) join `asignaciones` `a` on(`a`.`id` = `t`.`asignacion_id`)) join `materias` `m` on(`m`.`id` = `a`.`materia_id`)) join `grupos` `g` on(`g`.`id` = `a`.`grupo_id`)) join `usuarios` `p` on(`p`.`id` = `a`.`profesor_id`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_tareas_profesor`
--
DROP TABLE IF EXISTS `v_tareas_profesor`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_tareas_profesor`  AS SELECT `a`.`profesor_id` AS `profesor_id`, `t`.`id` AS `tarea_id`, `t`.`titulo` AS `titulo`, `t`.`tipo` AS `tipo`, `t`.`fecha_limite` AS `fecha_limite`, `t`.`hora_limite` AS `hora_limite`, `m`.`nombre` AS `materia`, `g`.`nombre` AS `grupo`, count(`e`.`id`) AS `total_estudiantes`, sum(`e`.`estado` = 'pendiente') AS `pendientes`, sum(`e`.`estado` <> 'pendiente') AS `entregadas` FROM ((((`tareas` `t` join `asignaciones` `a` on(`a`.`id` = `t`.`asignacion_id`)) join `materias` `m` on(`m`.`id` = `a`.`materia_id`)) join `grupos` `g` on(`g`.`id` = `a`.`grupo_id`)) left join `entregas` `e` on(`e`.`tarea_id` = `t`.`id`)) GROUP BY `t`.`id`, `a`.`profesor_id`, `t`.`titulo`, `t`.`tipo`, `t`.`fecha_limite`, `t`.`hora_limite`, `m`.`nombre`, `g`.`nombre` ORDER BY `t`.`fecha_limite` ASC, `t`.`hora_limite` ASC ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `asignaciones`
--
ALTER TABLE `asignaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_asignacion` (`profesor_id`,`materia_id`,`grupo_id`),
  ADD KEY `idx_asig_materia` (`materia_id`),
  ADD KEY `idx_asig_grupo` (`grupo_id`);

--
-- Indices de la tabla `consultas_ia`
--
ALTER TABLE `consultas_ia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ia_usuario` (`usuario_id`);

--
-- Indices de la tabla `entregas`
--
ALTER TABLE `entregas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_entrega` (`tarea_id`,`estudiante_id`),
  ADD KEY `idx_entrega_estudiante` (`estudiante_id`,`estado`);

--
-- Indices de la tabla `eventos`
--
ALTER TABLE `eventos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_eventos_fecha` (`fecha`),
  ADD KEY `fk_eventos_usuario` (`creado_por`),
  ADD KEY `fk_eventos_grupo` (`grupo_id`);

--
-- Indices de la tabla `grupos`
--
ALTER TABLE `grupos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_grupos_nombre_anio` (`nombre`,`anio`);

--
-- Indices de la tabla `materias`
--
ALTER TABLE `materias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_materias_nombre` (`nombre`);

--
-- Indices de la tabla `matriculas`
--
ALTER TABLE `matriculas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_matricula` (`estudiante_id`,`grupo_id`),
  ADD KEY `idx_matricula_grupo` (`grupo_id`);

--
-- Indices de la tabla `recordatorios`
--
ALTER TABLE `recordatorios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_record_aviso` (`enviado`,`avisar_en`),
  ADD KEY `fk_record_usuario` (`usuario_id`),
  ADD KEY `fk_record_tarea` (`tarea_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_roles_nombre` (`nombre`);

--
-- Indices de la tabla `tareas`
--
ALTER TABLE `tareas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tareas_asignacion` (`asignacion_id`),
  ADD KEY `idx_tareas_fecha` (`fecha_limite`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_usuarios_correo` (`correo`),
  ADD KEY `idx_usuarios_rol` (`rol_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `asignaciones`
--
ALTER TABLE `asignaciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `consultas_ia`
--
ALTER TABLE `consultas_ia`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `entregas`
--
ALTER TABLE `entregas`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `eventos`
--
ALTER TABLE `eventos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `grupos`
--
ALTER TABLE `grupos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `materias`
--
ALTER TABLE `materias`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `matriculas`
--
ALTER TABLE `matriculas`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `recordatorios`
--
ALTER TABLE `recordatorios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `tareas`
--
ALTER TABLE `tareas`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asignaciones`
--
ALTER TABLE `asignaciones`
  ADD CONSTRAINT `fk_asig_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_asig_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_asig_profesor` FOREIGN KEY (`profesor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `consultas_ia`
--
ALTER TABLE `consultas_ia`
  ADD CONSTRAINT `fk_ia_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `entregas`
--
ALTER TABLE `entregas`
  ADD CONSTRAINT `fk_entrega_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_entrega_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `eventos`
--
ALTER TABLE `eventos`
  ADD CONSTRAINT `fk_eventos_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_eventos_usuario` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `matriculas`
--
ALTER TABLE `matriculas`
  ADD CONSTRAINT `fk_mat_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mat_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `recordatorios`
--
ALTER TABLE `recordatorios`
  ADD CONSTRAINT `fk_record_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_record_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `tareas`
--
ALTER TABLE `tareas`
  ADD CONSTRAINT `fk_tareas_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
