// Drizzle sobre libSQL: Turso en Vercel, un archivo SQLite en local y en las pruebas. El driver web
// recibe el cliente ya creado, así el paquete de la función no arrastra el cliente nativo.
import type { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql/web';
import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';

export type Db = LibSQLDatabase;

export const conectar = (cliente: Client): Db => drizzle(cliente);
