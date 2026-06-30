/**
 * richiamami.js — Modulo "fatti richiamare" (Nome + Telefono) per LuniversoTuo
 *
 * Riceve un POST dal form (js/richiamami.js) e fa tre cose:
 *   1) Notifica email IMMEDIATA a chi richiama (via Resend) con Nome + Telefono.
 *   2) Invia l'evento Lead a Meta via Conversions API, server-side, con telefono
 *      e nome HASHATI (SHA-256) per alzare l'Event Match Quality. Stesso event_id
 *      del pixel browser → Meta deduplica (un solo Lead, non doppio).
 *   3) (Opzionale) inoltra il contatto a Delera via webhook in entrata, così
 *      Delera crea il contatto e fa partire l'automazione WhatsApp/SMS.
 *
 * Env vars su Netlify:
 *   RESEND_API_KEY      — (per la mail) la stessa già usata da digest.js
 *   RICHIAMO_TO         — (opz.) destinatario notifica, default info@luniversotuo.it
 *   RICHIAMO_FROM       — (opz.) mittente, default "LuniversoTuo <onboarding@resend.dev>"
 *   META_CAPI_TOKEN     — (per il Lead CAPI) la stessa del pixel
 *   META_PIXEL_ID       — (opz.) default 390681561312731
 *   DELERA_WEBHOOK_URL  — (opz.) URL webhook in entrata di Delera per creare il contatto
 */

const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID || '390681561312731';
const GRAPH_VERSION = 'v21.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, obj) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

function sha256(v) {
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}

function clientIp(event) {
  const h = event.headers || {};
  const raw = h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '';
  return String(raw).split(',')[0].trim() || undefined;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { error: 'JSON non valido' }); }

  const nome = String(data.nome || '').trim().slice(0, 80);
  const telefono = String(data.telefono || '').trim().slice(0, 40);
  const telDigits = telefono.replace(/[^0-9]/g, '');

  // Validazione minima (anti-spam base)
  if (nome.length < 2 || telDigits.length < 8) {
    return json(400, { error: 'Nome o telefono non validi' });
  }

  const h = event.headers || {};
  const ua = h['user-agent'] || h['User-Agent'];
  const ip = clientIp(event);
  const when = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  const results = { email: false, capi: false, delera: false };

  // 1) NOTIFICA EMAIL IMMEDIATA (Resend) ------------------------------------
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO = process.env.RICHIAMO_TO || 'info@luniversotuo.it';
  const FROM = process.env.RICHIAMO_FROM || 'LuniversoTuo <onboarding@resend.dev>';
  if (RESEND_API_KEY) {
    const subject = `Nuova richiesta di richiamo — ${nome}`;
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;">
        <h2 style="margin:0 0 12px;">Nuova richiesta di richiamo</h2>
        <p><strong>Nome:</strong> ${esc(nome)}<br>
        <strong>Telefono:</strong> <a href="tel:${esc(telDigits)}">${esc(telefono)}</a><br>
        <strong>Quando:</strong> ${esc(when)}</p>
        <p style="margin-top:16px;"><a href="tel:${esc(telDigits)}" style="background:#2563EB;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Chiama ora ${esc(nome)}</a></p>
        <p style="color:#666;font-size:12px;margin-top:18px;">Inviato dal modulo "fatti richiamare" su luniversotuo.it</p>
      </div>`;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [TO], subject, html })
      });
      results.email = r.ok;
    } catch (e) { /* non blocca */ }
  }

  // 2) LEAD via Conversions API (server-side, deduplicato col pixel) ---------
  const token = process.env.META_CAPI_TOKEN;
  if (token) {
    const user_data = {};
    if (data.fbp) user_data.fbp = data.fbp;
    if (data.fbc) user_data.fbc = data.fbc;
    if (ua) user_data.client_user_agent = ua;
    if (ip) user_data.client_ip_address = ip;
    user_data.ph = [sha256(telDigits)];
    if (nome) user_data.fn = [sha256(nome.split(' ')[0])];

    const ev = {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data,
      custom_data: { lead_source: 'richiamami' }
    };
    if (data.event_id) ev.event_id = data.event_id;           // deduplica col pixel browser
    if (data.event_source_url) ev.event_source_url = data.event_source_url;

    const body = { data: [ev] };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      results.capi = r.ok;
    } catch (e) { /* non blocca */ }
  }

  // 3) Inoltro a Delera (opzionale) -----------------------------------------
  const DELERA_WEBHOOK_URL = process.env.DELERA_WEBHOOK_URL;
  if (DELERA_WEBHOOK_URL) {
    const parts = nome.split(' ');
    try {
      const r = await fetch(DELERA_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: parts[0] || nome,
          last_name: parts.slice(1).join(' ') || '',
          full_name: nome,
          phone: telefono,
          source: 'Sito - Fatti richiamare',
          tags: ['richiamami', 'sito']
        })
      });
      results.delera = r.ok;
    } catch (e) { /* non blocca */ }
  }

  return json(200, { ok: true, results });
};
