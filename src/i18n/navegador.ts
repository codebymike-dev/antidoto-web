// Ayudas de idioma para los scripts del navegador. Aparte de ui.ts porque la API también importa
// ui.ts y se compila sin los tipos del DOM.
import { LOCALES, type Locale } from './ui';

/** Idioma de la página, leído del atributo lang de <html>. */
export function localeDocumento(): Locale {
  const l = document.documentElement.lang.slice(0, 2);
  return (LOCALES as readonly string[]).includes(l) ? (l as Locale) : 'es';
}
