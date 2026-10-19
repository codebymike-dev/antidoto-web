// Preguntas frecuentes de todo el sitio, en los tres idiomas. La home muestra las destacadas;
// /preguntas-frecuentes/ las agrupa por tema y cada línea de servicio muestra las suyas.
// Las respuestas entre corchetes son datos que faltan del cliente: no se publican en ninguna parte
// (ni en el sitio, ni en el JSON-LD, ni en el chat) hasta tener la respuesta.
// Regla: solo hechos del brief o del sitio; nada de cifras ni promesas sin validar.
import type { Locale } from '../i18n/ui';

export const TEMAS_FAQ = ['general', 'formaciones', 'audiovisual', 'catering', 'diseno', 'ia', 'cotizacion'] as const;
export type TemaFaq = (typeof TEMAS_FAQ)[number];

export interface Pregunta {
  clave: string;
  tema: TemaFaq;
  /** Sale en la home. */
  destacada?: boolean;
  es: [pregunta: string, respuesta: string];
  en: [pregunta: string, respuesta: string];
  pt: [pregunta: string, respuesta: string];
}

export const FAQ: Pregunta[] = [
  {
    clave: 'ciudades',
    tema: 'general',
    destacada: true,
    es: ['¿En qué ciudades prestan el servicio?', 'Estamos en Bogotá, en Pontevedra (atendemos con cita), y hacemos eventos en todo el país.'],
    en: ['Which cities do you work in?', 'We are based in Bogotá (Pontevedra, by appointment) and serve events across the country.'],
    pt: ['Em quais cidades vocês atendem?', 'Estamos em Bogotá, em Pontevedra (atendemos com hora marcada), e fazemos eventos em todo o país.'],
  },
  {
    clave: 'idiomas',
    tema: 'general',
    destacada: true,
    es: ['¿En qué idiomas trabajan?', 'Español, portugués e inglés.'],
    en: ['Which languages do you work in?', 'Spanish, Portuguese and English.'],
    pt: ['Em quais idiomas vocês trabalham?', 'Espanhol, português e inglês.'],
  },
  {
    clave: 'publico',
    tema: 'general',
    es: ['¿Trabajan solo con empresas?', 'No. Trabajamos con empresas, colegios, universidades y otras organizaciones.'],
    en: ['Do you only work with companies?', 'No. We work with companies, schools, universities and other organizations.'],
    pt: ['Vocês trabalham só com empresas?', 'Não. Trabalhamos com empresas, escolas, universidades e outras organizações.'],
  },
  {
    clave: 'combinar',
    tema: 'general',
    es: ['¿Puedo contratar varios servicios para un mismo evento?', 'Sí. Los servicios se contratan por separado o como un solo evento, con un solo equipo a cargo.'],
    en: ['Can I book several services for the same event?', 'Yes. Services can be booked separately or as a single event, with one team in charge.'],
    pt: ['Posso contratar vários serviços para o mesmo evento?', 'Sim. Os serviços são contratados separadamente ou como um só evento, com uma só equipe responsável.'],
  },
  {
    clave: 'virtual',
    tema: 'formaciones',
    destacada: true,
    es: ['¿Las formaciones pueden ser virtuales?', 'Sí. Las actividades digitales funcionan en sala, en campo o por videollamada.'],
    en: ['Can the training be virtual?', 'Yes. The digital activities work in a room, in the field or on a video call.'],
    pt: ['Os treinamentos podem ser virtuais?', 'Sim. As atividades digitais funcionam em sala, em campo ou por videochamada.'],
  },
  {
    clave: 'ia',
    tema: 'formaciones',
    es: ['¿Qué quiere decir que las formaciones tienen apoyo de IA?', '[CÓMO SE USA LA IA EN LAS FORMACIONES]'],
    en: ['What does it mean that the training is AI supported?', '[HOW AI IS USED IN THE TRAINING]'],
    pt: ['O que significa que os treinamentos têm apoio de IA?', '[COMO A IA É USADA NOS TREINAMENTOS]'],
  },
  {
    clave: 'colegios',
    tema: 'formaciones',
    es: ['¿Tienen formaciones para colegios?', 'Sí. Hacemos orientación vocacional e inclusión con metodología vivencial para colegios y universidades.'],
    en: ['Do you offer training for schools?', 'Yes. We run career guidance and inclusion programs with an experiential method for schools and universities.'],
    pt: ['Vocês têm treinamentos para escolas?', 'Sim. Fazemos orientação vocacional e inclusão com metodologia vivencial para escolas e universidades.'],
  },
  {
    clave: 'entrega-video',
    tema: 'audiovisual',
    destacada: true,
    es: ['¿Cuánto tarda la entrega de un video de inducción?', '[TIEMPO DE ENTREGA]'],
    en: ['How long does an onboarding video take to deliver?', '[DELIVERY TIME]'],
    pt: ['Quanto tempo leva a entrega de um vídeo de integração?', '[PRAZO DE ENTREGA]'],
  },
  {
    clave: 'calidad-video',
    tema: 'audiovisual',
    es: ['¿En qué calidad entregan los videos?', 'Entregamos en calidad 4K y podemos sumar tomas aéreas con dron.'],
    en: ['What quality do you deliver videos in?', 'We deliver in 4K and can add aerial drone footage.'],
    pt: ['Em que qualidade vocês entregam os vídeos?', 'Entregamos em qualidade 4K e podemos somar imagens aéreas com drone.'],
  },
  {
    clave: 'pedido-minimo',
    tema: 'catering',
    destacada: true,
    es: ['¿Cuál es el pedido mínimo de catering?', '[PEDIDO MÍNIMO]'],
    en: ['What is the minimum catering order?', '[MINIMUM ORDER]'],
    pt: ['Qual é o pedido mínimo de catering?', '[PEDIDO MÍNIMO]'],
  },
  {
    clave: 'cobertura-catering',
    tema: 'catering',
    es: ['¿El catering tiene cobertura nacional?', 'Sí. Atendemos eventos empresariales, académicos y sociales en todo el país, con logística flexible.'],
    en: ['Is the catering available nationwide?', 'Yes. We serve corporate, academic and social events across the country, with flexible logistics.'],
    pt: ['O catering tem cobertura nacional?', 'Sim. Atendemos eventos empresariais, acadêmicos e sociais em toda a Colômbia, com logística flexível.'],
  },
  {
    clave: 'diseno-proceso',
    tema: 'diseno',
    es: ['¿Pueden llevar una idea hasta el producto final?', 'Sí. Acompañamos desde el prototipo hasta el producto funcional, con la identidad de tu marca.'],
    en: ['Can you take an idea all the way to a finished product?', 'Yes. We work from the prototype to the functional product, with your brand’s identity.'],
    pt: ['Vocês conseguem levar uma ideia até o produto final?', 'Sim. Acompanhamos do protótipo ao produto funcional, com a identidade da sua marca.'],
  },
  {
    clave: 'ia-quien',
    tema: 'ia',
    es: ['¿Quién dicta la capacitación en IA?', 'Antídoto diseña y ofrece la capacitación, con su metodología vivencial y la logística a cargo del mismo equipo.'],
    en: ['Who teaches the AI training?', 'Antídoto designs and delivers the training, with its experiential method and the logistics handled by the same team.'],
    pt: ['Quem ministra a capacitação em IA?', 'A Antídoto desenha e oferece a capacitação, com sua metodologia vivencial e a logística a cargo da mesma equipe.'],
  },
  {
    clave: 'ia-herramienta',
    tema: 'ia',
    es: ['¿Con qué herramienta trabajamos?', 'Con la que tu empresa ya usa o piensa usar: Claude, Gemini, ChatGPT o Copilot. Si todavía no hay una definida, la capacitación ayuda a elegir.'],
    en: ['Which tool do we work with?', 'The one your company already uses or plans to use: Claude, Gemini, ChatGPT or Copilot. If none is chosen yet, the training helps you decide.'],
    pt: ['Com qual ferramenta trabalhamos?', 'Com a que sua empresa já usa ou pensa em usar: Claude, Gemini, ChatGPT ou Copilot. Se ainda não houver uma definida, a capacitação ajuda a escolher.'],
  },
  {
    clave: 'ia-a-medida',
    tema: 'ia',
    es: ['¿La capacitación se adapta a mi área?', 'Sí. Los ejercicios se arman con documentos y procesos parecidos a los de tu equipo, ya sea talento humano, SST, comunicaciones, finanzas o educación.'],
    en: ['Is the training tailored to my team?', 'Yes. The exercises are built with documents and processes similar to your team’s, whether HR, health and safety, communications, finance or education.'],
    pt: ['A capacitação se adapta à minha área?', 'Sim. Os exercícios são montados com documentos e processos parecidos com os da sua equipe, seja gestão de pessoas, SST, comunicação, finanças ou educação.'],
  },
  {
    clave: 'ia-datos',
    tema: 'ia',
    es: ['¿Qué pasa con la información confidencial de la empresa?', 'Es parte del programa: el equipo aprende qué datos no se entregan a un asistente de IA y cómo revisar lo que responde antes de usarlo.'],
    en: ['What about the company’s confidential information?', 'It is part of the program: the team learns which data never goes into an AI assistant and how to check its answers before using them.'],
    pt: ['E as informações confidenciais da empresa?', 'Fazem parte do programa: a equipe aprende quais dados não se entregam a um assistente de IA e como revisar o que ele responde antes de usar.'],
  },
  {
    clave: 'como-cotizar',
    tema: 'cotizacion',
    es: ['¿Cómo pido una cotización?', 'Con el cotizador del sitio: eliges el servicio, la fecha y el tamaño del grupo, y envías el mensaje por WhatsApp o por correo. También puedes llamarnos.'],
    en: ['How do I request a quote?', 'With the quote builder on this site: choose the service, the date and the group size, and send the message on WhatsApp or by email. You can also call us.'],
    pt: ['Como peço um orçamento?', 'Com a ferramenta de orçamento do site: você escolhe o serviço, a data e o tamanho do grupo, e envia a mensagem pelo WhatsApp ou por e-mail. Também pode nos ligar.'],
  },
  {
    clave: 'tiempo-respuesta',
    tema: 'cotizacion',
    es: ['¿Cuánto tardan en responder una cotización?', '[TIEMPO DE RESPUESTA]'],
    en: ['How long does it take to get a quote?', '[RESPONSE TIME]'],
    pt: ['Quanto tempo vocês levam para responder um orçamento?', '[PRAZO DE RESPOSTA]'],
  },
];

/** Una respuesta que es un dato pendiente del cliente (va entera entre corchetes). */
export const esPendiente = (respuesta: string) => /^\[.*\]$/.test(respuesta.trim());

/** Preguntas de un tema o de una lista de claves, en el idioma pedido. */
export function preguntas(locale: Locale, filtro: { tema?: TemaFaq; destacadas?: boolean } = {}) {
  return FAQ.filter((p) => (!filtro.tema || p.tema === filtro.tema) && (!filtro.destacadas || p.destacada)).map((p) => ({
    clave: p.clave,
    tema: p.tema,
    pregunta: p[locale][0],
    respuesta: p[locale][1],
  }));
}
