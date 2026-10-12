// Catálogo público de juegos de Misiones Antídoto (página /actividades/). Antídoto lo edita desde
// el panel (Contenido > Juegos); una entrada del panel reemplaza a la local con la misma clave.
// Regla: solo juegos propios o genéricos. Ninguno con la marca, imágenes o datos de un cliente sin
// su autorización escrita (el juego hecho para un cliente no se lista).

export interface TextosJuego {
  title: string;
  trabaja: string;
  /** Vacío mientras no esté confirmada: la tarjeta no la muestra. */
  duracion?: string;
  modalidad: string;
}

export interface JuegoLocal {
  clave: string;
  es: TextosJuego;
  en: TextosJuego;
}

export const JUEGOS_LOCALES: JuegoLocal[] = [
  {
    clave: 'detecta-el-riesgo',
    es: {
      title: 'Detecta el riesgo',
      trabaja: 'Identificar los riesgos en el puesto de trabajo o en la tienda. Versión genérica, sin la marca de ningún cliente.',
      modalidad: 'Desde el celular de cada participante',
    },
    en: {
      title: 'Spot the risk',
      trabaja: 'Identifying the risks at the workstation or in the store. A generic version, without any client’s brand.',
      modalidad: 'From each participant’s phone',
    },
  },
  {
    clave: 'a-la-medida',
    es: {
      title: 'Juego a la medida',
      trabaja: 'Configuramos el juego con los riesgos, el lugar y la marca de tu empresa.',
      modalidad: 'Desde el celular de cada participante',
    },
    en: {
      title: 'Custom game',
      trabaja: 'We set up the game with your company’s risks, workplace and brand.',
      modalidad: 'From each participant’s phone',
    },
  },
];
