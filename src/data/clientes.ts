// Clientes con logo. Solo marcas con autorización escrita (ver marca/clientes.md).
import type { ImageMetadata } from 'astro';

const logos = import.meta.glob<{ default: ImageMetadata }>('../assets/clientes/*.png', { eager: true });

/** Sectores de marca/clientes.md, agrupados para el filtro de la home. */
export const SECTORES = ['ingenieria', 'sst', 'seguros', 'transporte', 'otros'] as const;
export type Sector = (typeof SECTORES)[number];

/**
 * Clientes locales. Vacío a propósito: ninguna marca tiene autorización escrita para salir en el
 * sitio (brief del 08/10/2026). El inventario y los logos siguen en marca/clientes.md y
 * src/assets/clientes/. Los clientes autorizados se publican desde el panel; obtenerClientes()
 * (src/data/contenido.ts) une las dos fuentes.
 */
export const CLIENTES_LOCALES: Array<[archivo: string, nombre: string, sector: Sector]> = [];

export const CLIENTES = CLIENTES_LOCALES.map(([archivo, nombre, sector]) => {
  const mod = logos[`../assets/clientes/${archivo}.png`];
  if (!mod) throw new Error(`Falta el logo de ${nombre}: src/assets/clientes/${archivo}.png`);
  return { nombre, sector, logo: mod.default };
});

export function contarPorSector(sector: Sector): number {
  return CLIENTES.filter((c) => c.sector === sector).length;
}
