/**
 * log.js — Salva le conversazioni di Chiara in Netlify Blobs
 * LuniversoTuo · riceve POST dal widget e dalla pagina /chat
 *
 * Funziona automaticamente sull'ambiente Netlify Functions.
 * Opzionali (solo se vuoi forzare il sito): NETLIFY_SITE_ID, NETLIFY_API_TOKEN
 */

const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function chatStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_API_TOKEN;
  // Se le env var sono presenti le uso, altrimenti config automatica del runtime
  return (siteID && token)
    ? getStore({ name: 'chat-sessions', siteID, token })
    : getStore('chat-sessions');
}

exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
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

    // Normalizza il transcript: array di { role: 'user'|'assistant', text }
    let transcript = Array.isArray(data.transcript) ? data.transcript : [];
    transcript = transcript
      .filter(m => m && typeof m.text === 'string' && m.text.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        text: String(m.text).slice(0, 4000)
      }))
      .slice(0, 100);

    // Ricava le domande utente dal transcript (retro-compatibile con l'admin)
    const userMsgs = transcript.filter(m => m.role === 'user').map(m => m.text);

    const store = chatStore();
    await store.setJSON(data.session_id, {
      session_id:     data.session_id,
      timestamp:      data.timestamp || new Date().toISOString(),
      page:           data.page || '',
      messages_count: data.messages_count || transcript.length || 0,
      first_question: data.first_question || userMsgs[0] || '',
      user_questions: data.user_questions || userMsgs.join(' ||| '),
      transcript:     transcript,
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
