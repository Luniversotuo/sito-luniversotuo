/**
 * log.js — Salva sessioni chat in Netlify Blobs
 * LuniversoTuo · riceve POST dal widget Chiara
 *
 * Richiede env vars su Netlify:
 *   NETLIFY_SITE_ID  — UUID del sito (Settings → General → Site ID)
 *   NETLIFY_API_TOKEN — token personale Netlify
 */

const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_API_TOKEN;

  if (!siteID || !token) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Env vars NETLIFY_SITE_ID e NETLIFY_API_TOKEN non configurate.' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    if (!data.session_id) {
      return {
        statusCode: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'session_id mancante' })
      };
    }

    const store = getStore({ name: 'chat-sessions', siteID, token });

    await store.setJSON(data.session_id, {
      session_id:     data.session_id,
      timestamp:      data.timestamp || new Date().toISOString(),
      page:           data.page || '',
      messages_count: data.messages_count || 0,
      first_question: data.first_question || '',
      user_questions: data.user_questions || '',
      booked:         data.booked || 'no',
      logged_at:      new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
