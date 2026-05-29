/**
 * sessions.js — Restituisce tutte le sessioni chat da Netlify Blobs
 * LuniversoTuo · usato dall'admin dashboard
 * Auth: Bearer token Netlify (verificato contro Netlify API)
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

  // Verifica token Netlify nell'header Authorization
  const auth = (event.headers.authorization || event.headers.Authorization || '').trim();
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token) {
    return {
      statusCode: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Token mancante. Inserisci il token Netlify nell\'area admin.' })
    };
  }

  try {
    // Verifica che il token sia un token Netlify valido
    const check = await fetch('https://api.netlify.com/api/v1/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!check.ok) {
      return {
        statusCode: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Token Netlify non valido. Verifica nelle impostazioni.' })
      };
    }

    // Leggi tutte le sessioni dallo store
    const store = getStore('chat-sessions');
    const { blobs } = await store.list();

    if (!blobs || blobs.length === 0) {
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      };
    }

    // Recupera i dati di ogni sessione
    const sessions = await Promise.all(
      blobs.map(async ({ key }) => {
        try {
          return await store.get(key, { type: 'json' });
        } catch {
          return null;
        }
      })
    );

    // Filtra nulls, ordina per timestamp decrescente (più recenti prima)
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
