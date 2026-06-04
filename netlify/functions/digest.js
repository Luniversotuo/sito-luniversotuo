/**
 * digest.js — Email riepilogativa giornaliera delle conversazioni di Chiara
 * LuniversoTuo · funzione SCHEDULATA (vedi netlify.toml: schedule "0 7 * * *" = ~08:00/09:00 Italia)
 *
 * Env vars su Netlify:
 *   RESEND_API_KEY  — chiave API Resend (https://resend.com) per inviare l'email
 *   DIGEST_TO       — (opzionale) destinatario, default info@luniversotuo.it
 *   DIGEST_FROM     — (opzionale) mittente, default "Chiara LuniversoTuo <onboarding@resend.dev>"
 *   NETLIFY_SITE_ID / NETLIFY_API_TOKEN — (opzionali) altrimenti config automatica del runtime
 */

const { getStore } = require('@netlify/blobs');

function chatStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_API_TOKEN;
  return (siteID && token)
    ? getStore({ name: 'chat-sessions', siteID, token })
    : getStore('chat-sessions');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
    });
  } catch { return iso || ''; }
}

function renderConversation(s) {
  const when = fmtDateTime(s.timestamp || s.logged_at);
  const booked = s.booked === 'si'
    ? '<span style="color:#16a34a;font-weight:700;">· PRENOTATO</span>' : '';
  const t = Array.isArray(s.transcript) ? s.transcript : [];

  let bubbles;
  if (!t.length) {
    bubbles = `<div style="color:#666;font-size:13px;">Domande utente: ${esc(s.user_questions || '—')}</div>`;
  } else {
    bubbles = t.map(m => {
      const isUser = m.role === 'user';
      const who = isUser ? 'Utente' : 'Chiara';
      const bg = isUser ? '#eef3ff' : '#f4f4f6';
      const align = isUser ? 'right' : 'left';
      return `<div style="margin:6px 0;text-align:${align};">
        <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.4px;margin:0 4px 2px;">${who}</div>
        <div style="display:inline-block;max-width:82%;text-align:left;background:${bg};border:1px solid #e3e3ea;border-radius:12px;padding:8px 12px;font-size:13px;line-height:1.5;color:#1a1a1a;white-space:pre-wrap;">${esc(m.text)}</div>
      </div>`;
    }).join('');
  }

  return `<div style="border:1px solid #e3e3ea;border-radius:12px;padding:16px;margin-bottom:16px;background:#fff;">
    <div style="font-size:12px;color:#555;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:8px;">
      ${esc(when)} · pagina: ${esc(s.page || 'home')} · ${t.length || s.messages_count || 0} messaggi ${booked}
    </div>
    ${bubbles}
  </div>`;
}

const handler = async () => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO   = process.env.DIGEST_TO   || 'info@luniversotuo.it';
  const FROM = process.env.DIGEST_FROM || 'Chiara LuniversoTuo <onboarding@resend.dev>';

  if (!RESEND_API_KEY) {
    console.log('[digest] RESEND_API_KEY non configurata: salto invio.');
    return { statusCode: 200, body: 'RESEND_API_KEY mancante' };
  }

  // 1) Leggi tutte le sessioni
  let sessions = [];
  try {
    const store = chatStore();
    const { blobs } = await store.list();
    sessions = await Promise.all((blobs || []).map(async ({ key }) => {
      try { return await store.get(key, { type: 'json' }); } catch { return null; }
    }));
    sessions = sessions.filter(Boolean);
  } catch (e) {
    console.log('[digest] errore lettura blobs:', e.message);
    return { statusCode: 500, body: e.message };
  }

  // 2) Filtra ultime 24h
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = sessions
    .filter(s => new Date(s.timestamp || s.logged_at || 0).getTime() >= since)
    .sort((a, b) => new Date(b.timestamp || b.logged_at || 0) - new Date(a.timestamp || a.logged_at || 0));

  if (recent.length === 0) {
    console.log('[digest] nessuna conversazione nelle ultime 24h: nessuna email inviata.');
    return { statusCode: 200, body: 'Nessuna conversazione' };
  }

  // 3) Costruisci email
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
  const bookedN = recent.filter(s => s.booked === 'si').length;
  const subject = `Chiara · ${recent.length} conversazion${recent.length === 1 ? 'e' : 'i'} nelle ultime 24h`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:660px;margin:0 auto;padding:8px;background:#f6f7f9;">
    <div style="background:#07080e;border-radius:12px;padding:22px 24px;margin-bottom:18px;">
      <div style="color:#fff;font-size:18px;font-weight:700;">Conversazioni con Chiara</div>
      <div style="color:#9db4e6;font-size:13px;margin-top:4px;">Riepilogo del ${esc(oggi)} · ${recent.length} conversazioni · ${bookedN} con prenotazione</div>
    </div>
    ${recent.map(renderConversation).join('')}
    <div style="text-align:center;color:#999;font-size:11px;padding:10px 0 4px;">LuniversoTuo · email automatica generata dal sito. Le trovi anche nel pannello admin.</div>
  </div>`;

  // 4) Invia via Resend
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], subject, html })
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.log('[digest] Resend errore:', res.status, JSON.stringify(out));
      return { statusCode: res.status, body: JSON.stringify(out) };
    }
    console.log('[digest] email inviata a', TO, '·', recent.length, 'conversazioni');
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.log('[digest] errore invio:', e.message);
    return { statusCode: 500, body: e.message };
  }
};

exports.handler = handler;
