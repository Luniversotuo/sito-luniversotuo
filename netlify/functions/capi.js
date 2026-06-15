/**
 * capi.js — Meta Conversions API (server-side) per LuniversoTuo
 *
 * Riceve gli eventi dal sito (POST da js/cookie-banner.js) e li inoltra a Meta
 * server-to-server. Ogni evento arriva anche dal pixel browser con lo STESSO
 * event_id → Meta deduplica automaticamente e recupera le conversioni perse
 * per blocco cookie / iOS / scheda chiusa.
 *
 * Env vars su Netlify (Settings → Environment variables):
 *   META_CAPI_TOKEN      — (OBBLIGATORIA) token Conversions API generato in
 *                          Events Manager → Impostazioni → Conversions API →
 *                          "Genera token di accesso". È un segreto: solo qui, mai nel codice.
 *   META_PIXEL_ID        — (opzionale) default 390681561312731
 *   META_TEST_EVENT_CODE — (opzionale) codice "Eventi di test" per la verifica in Events Manager.
 *                          Toglilo (o lascialo vuoto) quando sei in produzione.
 */

const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID || '390681561312731';
const GRAPH_VERSION = 'v21.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Eventi ammessi (whitelist): evita invii arbitrari verso il pixel.
const ALLOWED_EVENTS = ['PageView', 'InitiateCheckout', 'Schedule', 'Lead', 'ViewContent', 'Contact'];

function json(statusCode, obj) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

// SHA-256 lowercase/trim: standard Meta per i dati personali (mai inviati in chiaro).
function sha256(v) {
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}

function clientIp(event) {
  const h = event.headers || {};
  const raw = h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '';
  return String(raw).split(',')[0].trim() || undefined;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };

  const token = process.env.META_CAPI_TOKEN;
  if (!token) return json(500, { error: 'META_CAPI_TOKEN non configurato su Netlify' });

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { error: 'JSON non valido' }); }

  const eventName = data.event_name;
  if (!ALLOWED_EVENTS.includes(eventName)) {
    return json(400, { error: 'event_name non ammesso', received: eventName });
  }

  const h = event.headers || {};
  const ua = h['user-agent'] || h['User-Agent'];
  const ip = clientIp(event);

  const user_data = {};
  if (data.fbp) user_data.fbp = data.fbp;
  if (data.fbc) user_data.fbc = data.fbc;
  if (ua) user_data.client_user_agent = ua;
  if (ip) user_data.client_ip_address = ip;
  if (data.email) user_data.em = [sha256(data.email)];
  if (data.phone) user_data.ph = [sha256(String(data.phone).replace(/[^0-9]/g, ''))];
  if (data.fn) user_data.fn = [sha256(data.fn)];
  if (data.ln) user_data.ln = [sha256(data.ln)];

  const ev = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data
  };
  if (data.event_id) ev.event_id = data.event_id;            // deduplica col pixel
  if (data.event_source_url) ev.event_source_url = data.event_source_url;
  if (data.custom_data && typeof data.custom_data === 'object') ev.custom_data = data.custom_data;

  const body = { data: [ev] };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const meta = await r.json().catch(() => ({}));
    if (!r.ok) return json(502, { error: 'Errore Meta API', details: meta });
    return json(200, { ok: true, event: eventName, meta });
  } catch (e) {
    return json(500, { error: String((e && e.message) || e) });
  }
};
