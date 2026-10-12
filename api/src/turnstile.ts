// Cloudflare Turnstile (gratuito): comprueba que quien usa el chat con IA no sea un bot. Solo
// corre si la API tiene TURNSTILE_SECRET y el sitio se construyó con PUBLIC_TURNSTILE_SITEKEY.
// Cada token sirve una sola vez: el navegador pide uno nuevo para cada pregunta.

const VERIFICAR = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * true si Cloudflare valida el token; false si lo rechaza o no hay token. null si Cloudflare no
 * respondió: la ruta decide (el chat sigue, con el resto de los límites).
 */
export async function verificarTurnstile(secreto: string, token: unknown, ip: string | null, f: typeof fetch = fetch): Promise<boolean | null> {
  if (typeof token !== 'string' || !token || token.length > 4096) return false;
  const cuerpo = new FormData();
  cuerpo.set('secret', secreto);
  cuerpo.set('response', token);
  if (ip) cuerpo.set('remoteip', ip);
  try {
    const r = await f(VERIFICAR, { method: 'POST', body: cuerpo, signal: AbortSignal.timeout(5_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch (e) {
    console.error('[turnstile] sin respuesta', e);
    return null;
  }
}
