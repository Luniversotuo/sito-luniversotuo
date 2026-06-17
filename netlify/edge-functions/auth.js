/**
 * Edge Function: protezione AREA CONSULENTI con utente + password (HTTP Basic Auth).
 * Protegge SOLO il percorso /consulenti/ (e tutto ciò che sta sotto).
 * Il resto del sito pubblico (luniversotuo.it) resta liberamente accessibile.
 *
 * Le credenziali NON sono nel codice: vanno impostate come variabili d'ambiente
 * nelle impostazioni del sito su Netlify (Site settings → Environment variables):
 *   AUTH_USER  = il nome utente che vuoi
 *   AUTH_PASS  = la password che vuoi
 *
 * Finché non imposti le due variabili, l'area consulenti resta accessibile
 * (per non bloccarti durante la configurazione). Appena le imposti, scatta la
 * richiesta di login. Gratuito sul piano Netlify.
 */
export default async (request, context) => {
  const USER = Netlify.env.get("AUTH_USER");
  const PASS = Netlify.env.get("AUTH_PASS");

  // Non ancora configurato: lascia passare (evita lockout in fase di setup)
  if (!USER || !PASS) return context.next();

  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, p] = atob(header.slice(6)).split(":");
      if (u === USER && p === PASS) return context.next();
    } catch (_) { /* header malformato */ }
  }

  return new Response("Area consulenti — accesso riservato.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Area Consulenti LuniversoTuo", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8"
    }
  });
};

// Protegge sia /consulenti che tutto ciò che sta sotto /consulenti/...
export const config = { path: ["/consulenti", "/consulenti/*"] };
