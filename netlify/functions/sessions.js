/**
 * sessions.js — Restituisce tutte le sessioni chat da Netlify Blobs
 * LuniversoTuo · usato dall'admin dashboard
 *
 * Auth: Bearer <password-admin> confrontata con env var ADMIN_PASSWORD
 *
 * Env vars richieste su Netlify:
 *   NETLIFY_SITE_ID   — UUID del sito (Settings → General → Site ID)
 *   NETLIFY_API_TOKEN — token personale Netlify (server-side, mai esposto)
 *   ADMIN_PASSWORD    — la password dell'admin (la stessa del login)
 */

const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  // Leggi token dall'header Authorization
  const auth = (event.headers.authorization || event.headers.Authorization || '').trim();
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token) {
    return {
      statusCode: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Accesso non autorizzato.' })
    };
  }

  // Verifica password contro env var ADMIN_PASSWORD
  const adminPwd = process.env.ADMIN_PASSWORD;
  if (!adminPwd || token !== adminPwd) {
    return {
      statusCode: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Password non corretta. Aggiorna la variabile ADMIN_PASSWORD su Netlify.' })
    };
  }

  const siteID = process.env.NETLIFY_SITE_ID;
  const apiToken = process.env.NETLIFY_API_TOKEN;

  try {
    // Se le env var sono presenti le uso, altrimenti config automatica del runtime
    const store = (siteID && apiToken)
      ? getStore({ name: 'chat-sessions', siteID, token: apiToken })
      : getStore('chat-sessions');
    const { blobs } = await store.list();

    if (!blobs || blobs.length === 0) {
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      };
    }

    const sessions = await Promise.all(
      blobs.map(async ({ key }) => {
        try { return await store.get(key, { type: 'json' }); }
        catch { return null; }
      })
    );

    const valid = sessions
      .filter(Boolean)
      .sort((a, b) => {
        const ta = new Date(a.timestamp || a.logged_at || 0).getTime();
        const tb = new Date(b.timestamp || b.logged_at || 0).getTime();
        return tb - ta;
      });

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(valid)
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
