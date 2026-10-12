CREATE TABLE `clics` (
	`dia` text NOT NULL,
	`tipo` text NOT NULL,
	`pagina` text NOT NULL,
	`n` integer NOT NULL,
	PRIMARY KEY(`dia`, `tipo`, `pagina`)
);
