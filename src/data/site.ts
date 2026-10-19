// Datos de contacto y de la empresa. Fuentes: auditoria/02-prompt-claude-design.md §1 y el brief del
// 08/10/2026 (certificado de Cámara de Comercio y resolución de la licencia).
import type { Locale } from '../i18n/ui';

export const SITE = {
  name: 'Antídoto',
  url: 'https://antidotocolombia.com',
  /** Solo WhatsApp: nunca va en un enlace tel:. */
  whatsapp: '573125568016',
  phoneDisplay: '+57 312 556 8016',
  /** Línea para llamadas, con enlace tel:. */
  llamadas: '573223660733',
  llamadasDisplay: '+57 322 366 0733',
  /** Hasta que exista contacto@antidotocolombia.com. */
  email: 'antidoto.colombia@outlook.com',
  instagram: 'https://www.instagram.com/antidoto.colombia/',
  linkedin: 'https://www.linkedin.com/company/antidoto-colombia-s-a-s/',
  /** Año de la marca. La sociedad se constituyó en 2023 (EMPRESA.constitucion). */
  foundingYear: 2020,
} as const;

/** Datos legales: pie, política de datos y términos. El domicilio solo va en la política. */
export const EMPRESA = {
  razonSocial: 'ANTIDOTO S.A.S.',
  nit: '901.777.384-6',
  domicilio: 'Av. Calle 116 # 71 A - 25, Bogotá D.C.',
  /** Lo que se publica como ubicación (pie y contacto). */
  ubicacion: { es: 'Pontevedra, Bogotá · Atención con cita', en: 'Pontevedra, Bogotá · By appointment', pt: 'Pontevedra, Bogotá · Atendimento com hora marcada' },
  ciudad: 'Bogotá',
  constitucion: 2023,
} as const;

/**
 * Licencia en Seguridad y Salud en el Trabajo, con el texto exacto de la resolución. Sin fecha de
 * expedición y sin publicar el PDF (lleva la cédula de la representante). Solo se asocia a los
 * campos de acción, nunca a audiovisual, catering, IA ni a las auditorías de PESV, RUC o ISO.
 */
export const LICENCIA = {
  resolucion: '36081-2026',
  entidad: { es: 'Secretaría Distrital de Salud de Bogotá', en: 'Bogotá District Health Department', pt: 'Secretaria Distrital de Saúde de Bogotá' },
  campos: {
    es: [
      'Seguridad industrial u ocupacional',
      'Investigación del accidente de trabajo y la enfermedad laboral',
      'Investigación en área técnica',
      'Capacitación en seguridad y salud en el trabajo',
      'Diseño, administración y ejecución del Sistema de Gestión de la Seguridad y Salud en el Trabajo',
    ],
    en: [
      'Industrial or occupational safety',
      'Investigation of work accidents and occupational disease',
      'Technical research',
      'Occupational health and safety training',
      'Design, management and implementation of the Occupational Health and Safety Management System',
    ],
    pt: [
      'Segurança industrial ou ocupacional',
      'Investigação do acidente de trabalho e da doença ocupacional',
      'Pesquisa em área técnica',
      'Capacitação em segurança e saúde no trabalho',
      'Desenho, administração e execução do Sistema de Gestão da Segurança e Saúde no Trabalho',
    ],
  },
} as const;

/**
 * Plataforma de juegos (Misiones Antídoto): proyecto aparte (Next.js en Vercel, repo `antidoto`).
 * Los participantes entran con el código de su actividad desde /actividades/ y las empresas ven
 * sus resultados en /admin/. Va en la URL de Vercel hasta tener el DNS; ahí solo cambian estas URLs
 * por juegos.antidotocolombia.com (la de Vercel sigue sirviendo mientras algún cliente la use).
 */
export const PORTAL = {
  url: 'https://antidotocolombia.vercel.app/',
  empresas: 'https://antidotocolombia.vercel.app/admin/login',
} as const;

/** Enlace de WhatsApp con el mensaje ya escrito. */
export function waLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

/**
 * Clip del hero de la home. Cuando el cliente lo entregue (horizontal, 1080p, 15 a 25 s, sin
 * texto, logos ni audio), codifícalo a MP4 H.264 de 720p y ~1 MB (y si se quiere, WebM AV1),
 * déjalo en public/video/ y pon aquí sus rutas. Mientras sea null, la escena son las fotos.
 */
/**
 * Regalo por suscribirse (una guía en PDF, por ejemplo). Mientras sea null no se promete nada.
 * Cuando el cliente lo entregue: pon aquí su nombre en los tres idiomas y su enlace en el correo
 * de bienvenida (bandeja > Campañas > Correos automáticos).
 */
export const REGALO_NOVEDADES: Record<Locale, string> | null = null as Record<Locale, string> | null;

export const VIDEO_HERO: { mp4: string; webm?: string } | null = null as { mp4: string; webm?: string } | null;
