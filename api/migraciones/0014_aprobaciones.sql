CREATE TABLE `aprobaciones` (
	`id` text PRIMARY KEY NOT NULL,
	`creado` integer NOT NULL,
	`formulario` text NOT NULL,
	`nit` text NOT NULL,
	`nombre` text NOT NULL,
	`cargo` text NOT NULL,
	`correo` text,
	`fecha` text NOT NULL,
	`respuestas` text NOT NULL,
	`observaciones` text,
	`aprobados` integer NOT NULL,
	`condiciones` integer NOT NULL,
	`rechazados` integer NOT NULL,
	`ip_hash` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE INDEX `aprobaciones_creado` ON `aprobaciones` (`creado`);