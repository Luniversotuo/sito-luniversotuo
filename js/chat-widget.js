/**
 * Sofia — Consulente Virtuale SuperSerenità®
 * LuniversoTuo · Agenzia Allianz · Pescia
 *
 * CONFIGURAZIONE: cerca il commento "IMPOSTA QUI" qui sotto
 * e inserisci la tua chiave API Anthropic.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
   *  CONFIGURAZIONE — IMPOSTA QUI LA TUA API KEY
   * ───────────────────────────────────────────── */
  const CONFIG = {
    apiKey:    'INSERISCI_QUI_LA_TUA_CHIAVE_API',  // ← la chiave Anthropic (sk-ant-...)
    model:     'claude-haiku-4-5-20251001',
    aiName:    'Sofia',
    aiAvatar:  '✦',
    bookingUrl: 'https://link.delera.co/widget/booking/69aAGsNLdFAAqFk5lbjp',
    systemPrompt: `Sei Sofia, la consulente virtuale di LuniversoTuo — agenzia Allianz a Pescia, Toscana.

Parli sempre in italiano. Sei umana, calda, presente — non una macchina, non un robot assicurativo.
Il tuo tono è quello di una persona che capisce davvero le paure delle famiglie italiane.

La SuperSerenità® è uno stato emotivo: la libertà di vivere senza paure economiche, senza ansie, senza sorprese.
Non è un prodotto. È un percorso in 4 movimenti: Vedere, Comprendere, Scegliere, Mantenere.

LE TUE REGOLE (non derogabili):
— Risposte brevi: mai più di 4 frasi. Sii essenziale.
— Zero tecnicismi: niente codici polizza, premi, franchigie, clausole.
— Parla di paure concrete: il mutuo, i figli, la malattia, i genitori anziani, il lavoro che potrebbe mancare.
— Dopo 2–3 scambi, invita gentilmente a prenotare la consulenza gratuita (60 minuti, zero impegno).
— Se chiedono dati tecnici specifici, di' che il team li affronterà insieme in consulenza.
— Non inventare garanzie, importi o prodotti specifici.
— Sii rassicurante, mai allarmista.

DATI UTILI:
— 461 recensioni ECCELLENTE (Trustindex) — tra le agenzie Allianz più recensite d'Italia
— 15.184 rischi economici analizzati
— 5 professionisti dedicati: Giancarlo (fondatore), Francesco, Elisabetta, Gabriele, Sara
— Consulenza gratuita, 60 minuti, online o di persona a Pescia
— Telefono: 0572 47139 · Email: info@luniversotuo.it

LINK PRENOTAZIONE (usalo quando inviti a prenotare):
https://link.delera.co/widget/booking/69aAGsNLdFAAqFk5lbjp

Inizia sempre con calore. La prima risposta deve far sentire il visitatore capito, non venduto.`
  };

  /* ─────────────────────────────────────────────
   *  MESSAGGI RAPIDI DI AVVIO
   * ───────────────────────────────────────────── */
  const QUICK_REPLIES = [
    { label: 'Cos\'è la SuperSerenità®?', text: 'Cos\'è esattamente la SuperSerenità®? Non ho capito bene.' },
    { label: 'Ho una paura specifica...', text: 'Ho una preoccupazione che mi tormenta. Posso dirtela?' },
    { label: 'Come funziona la consulenza?', text: 'Come funziona la consulenza gratuita? A cosa mi impegno?' },
    { label: 'Sono già assicurato, serve?', text: 'Ho già delle assicurazioni. La SuperSerenità® serve anche a me?' }
  ];

  /* ─────────────────────────────────────────────
   *  CSS WIDGET
   * ───────────────────────────────────────────── */
  const CSS = `
    #ss-chat-widget * { box-sizing: border-box; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }

    #ss-chat-btn {
      position: fixed; bottom: 28px; left: 28px; z-index: 9998;
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #1d4ed8 0%, #2563EB 100%);
      box-shadow: 0 4px 24px rgba(37,99,235,0.45);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #ss-chat-btn:hover { transform: scale(1.07); box-shadow: 0 6px 32px rgba(37,99,235,0.6); }
    #ss-chat-btn svg { width: 26px; height: 26px; fill: none; stroke: white; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    #ss-chat-badge {
      position: absolute; top: -3px; right: -3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #22c55e; border: 2.5px solid #0b0d14;
      font-size: 10px; font-weight: 700; color: white;
      display: flex; align-items: center; justify-content: center;
    }

    #ss-chat-panel {
      position: fixed; bottom: 102px; left: 28px; z-index: 9999;
      width: 380px; height: 560px;
      background: #0e1019;
      border: 0.5px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(37,99,235,0.15);
      display: flex; flex-direction: column;
      overflow: hidden;
      transform: translateY(16px) scale(0.97);
      opacity: 0; pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
    }
    #ss-chat-panel.open {
      transform: translateY(0) scale(1);
      opacity: 1; pointer-events: all;
    }

    #ss-chat-header {
      background: #13151f;
      border-bottom: 0.5px solid rgba(255,255,255,0.07);
      padding: 16px 18px; display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    #ss-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #1d4ed8, #7c3aed);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0; position: relative;
    }
    #ss-avatar-status {
      position: absolute; bottom: 1px; right: 1px;
      width: 10px; height: 10px; border-radius: 50%;
      background: #22c55e; border: 2px solid #13151f;
    }
    #ss-header-info { flex: 1; }
    #ss-header-name { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.2px; }
    #ss-header-role { font-size: 11px; color: rgba(255,255,255,0.38); margin-top: 1px; }
    #ss-close-btn {
      background: none; border: none; cursor: pointer; padding: 6px;
      color: rgba(255,255,255,0.35); display: flex; align-items: center;
      border-radius: 8px; transition: background 0.15s, color 0.15s;
    }
    #ss-close-btn:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
    #ss-close-btn svg { width: 18px; height: 18px; }

    #ss-messages {
      flex: 1; overflow-y: auto; padding: 20px 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #ss-messages::-webkit-scrollbar { width: 4px; }
    #ss-messages::-webkit-scrollbar-track { background: transparent; }
    #ss-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    .ss-msg { display: flex; flex-direction: column; gap: 4px; max-width: 88%; }
    .ss-msg.ai { align-self: flex-start; }
    .ss-msg.user { align-self: flex-end; }

    .ss-bubble {
      padding: 11px 14px; border-radius: 14px;
      font-size: 13.5px; line-height: 1.6; letter-spacing: -0.1px;
    }
    .ss-msg.ai .ss-bubble {
      background: #1a1d2e;
      border: 0.5px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.88);
      border-bottom-left-radius: 4px;
    }
    .ss-msg.user .ss-bubble {
      background: #2563EB;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .ss-msg-time { font-size: 10px; color: rgba(255,255,255,0.22); padding: 0 4px; }
    .ss-msg.user .ss-msg-time { text-align: right; }

    .ss-typing {
      display: flex; align-items: center; gap: 4px;
      padding: 12px 14px;
      background: #1a1d2e;
      border: 0.5px solid rgba(255,255,255,0.08);
      border-radius: 14px; border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .ss-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.4);
      animation: ss-bounce 1.2s infinite;
    }
    .ss-dot:nth-child(2) { animation-delay: 0.18s; }
    .ss-dot:nth-child(3) { animation-delay: 0.36s; }
    @keyframes ss-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    #ss-quick-replies {
      padding: 0 16px 14px; display: flex; flex-direction: column; gap: 7px; flex-shrink: 0;
    }
    .ss-qr {
      background: none;
      border: 0.5px solid rgba(37,99,235,0.3);
      border-radius: 10px; padding: 9px 14px;
      color: rgba(147,186,255,0.85); font-size: 12.5px;
      cursor: pointer; text-align: left; line-height: 1.4;
      transition: background 0.15s, border-color 0.15s;
    }
    .ss-qr:hover { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.5); }

    #ss-input-area {
      border-top: 0.5px solid rgba(255,255,255,0.07);
      padding: 12px 14px; display: flex; gap: 8px; align-items: flex-end;
      background: #0e1019; flex-shrink: 0;
    }
    #ss-input {
      flex: 1; background: #1a1d2e;
      border: 0.5px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 10px 14px;
      color: rgba(255,255,255,0.9); font-size: 13.5px;
      resize: none; outline: none; line-height: 1.5;
      min-height: 42px; max-height: 100px;
      transition: border-color 0.15s;
    }
    #ss-input::placeholder { color: rgba(255,255,255,0.25); }
    #ss-input:focus { border-color: rgba(37,99,235,0.4); }
    #ss-send-btn {
      width: 40px; height: 40px; border-radius: 10px;
      background: #2563EB; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, transform 0.1s;
      flex-shrink: 0;
    }
    #ss-send-btn:hover { background: #1d4ed8; }
    #ss-send-btn:active { transform: scale(0.94); }
    #ss-send-btn svg { width: 17px; height: 17px; fill: none; stroke: white; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

    #ss-footer-link {
      text-align: center; padding: 6px 0 10px;
      font-size: 10px; color: rgba(255,255,255,0.18);
      flex-shrink: 0;
    }
    #ss-footer-link a { color: rgba(37,99,235,0.5); text-decoration: none; }

    #ss-book-cta {
      margin: 4px 0 8px;
      background: linear-gradient(90deg, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.08) 100%);
      border: 0.5px solid rgba(37,99,235,0.3);
      border-radius: 12px; padding: 12px 14px;
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; text-decoration: none; transition: background 0.2s;
    }
    #ss-book-cta:hover { background: rgba(37,99,235,0.2); }
    #ss-book-cta-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(37,99,235,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    #ss-book-cta-icon svg { width: 16px; height: 16px; fill: none; stroke: #93BAff; stroke-width: 2; }
    #ss-book-cta-text { flex: 1; }
    #ss-book-cta-title { font-size: 12.5px; font-weight: 600; color: rgba(147,186,255,0.9); }
    #ss-book-cta-sub { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 1px; }

    .ss-error-msg { font-size: 12px; color: rgba(239,68,68,0.7); padding: 4px 4px 0; }

    @media (max-width: 480px) {
      #ss-chat-panel { width: calc(100vw - 20px); left: 10px; bottom: 90px; height: 70vh; max-height: 520px; }
      #ss-chat-btn { left: 20px; bottom: 20px; }
    }
  `;

  /* ─────────────────────────────────────────────
   *  UTILS
   * ───────────────────────────────────────────── */
  function now() {
    return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  /* ─────────────────────────────────────────────
   *  INIEZIONE DOM
   * ───────────────────────────────────────────── */
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildWidget() {
    const wrap = document.createElement('div');
    wrap.id = 'ss-chat-widget';
    wrap.innerHTML = `
      <!-- BOTTONE FLOATING -->
      <button id="ss-chat-btn" aria-label="Parla con Sofia — Consulente SuperSerenità®">
        <div id="ss-chat-badge">1</div>
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>

      <!-- PANNELLO CHAT -->
      <div id="ss-chat-panel" role="dialog" aria-label="Chat con Sofia">
        <div id="ss-chat-header">
          <div id="ss-avatar">✦<div id="ss-avatar-status"></div></div>
          <div id="ss-header-info">
            <div id="ss-header-name">Sofia</div>
            <div id="ss-header-role">Consulente SuperSerenità® · Online ora</div>
          </div>
          <button id="ss-close-btn" aria-label="Chiudi chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="ss-messages"></div>

        <div id="ss-quick-replies"></div>

        <div id="ss-input-area">
          <textarea id="ss-input" placeholder="Scrivi qui la tua domanda..." rows="1" autocomplete="off"></textarea>
          <button id="ss-send-btn" aria-label="Invia">
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>

        <div id="ss-footer-link">Powered by <a href="https://www.luniversotuo.it" target="_blank">LuniversoTuo</a> × Claude AI</div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  /* ─────────────────────────────────────────────
   *  LOGICA MESSAGGI
   * ───────────────────────────────────────────── */
  let messages = []; // history per l'API
  let isTyping = false;
  let quickShown = true;

  function getMessagesEl() { return document.getElementById('ss-messages'); }
  function getQuickEl()    { return document.getElementById('ss-quick-replies'); }

  function scrollBottom() {
    const el = getMessagesEl();
    if (el) el.scrollTop = el.scrollHeight;
  }

  function addMessage(role, text) {
    const el = getMessagesEl();
    const wrap = document.createElement('div');
    wrap.className = `ss-msg ${role === 'assistant' ? 'ai' : 'user'}`;

    const bubble = document.createElement('div');
    bubble.className = 'ss-bubble';
    bubble.innerHTML = escapeHtml(text);
    wrap.appendChild(bubble);

    const time = document.createElement('div');
    time.className = 'ss-msg-time';
    time.textContent = now();
    wrap.appendChild(time);

    el.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function showTyping() {
    const el = getMessagesEl();
    const typingWrap = document.createElement('div');
    typingWrap.className = 'ss-msg ai';
    typingWrap.id = 'ss-typing-indicator';
    typingWrap.innerHTML = `<div class="ss-typing"><div class="ss-dot"></div><div class="ss-dot"></div><div class="ss-dot"></div></div>`;
    el.appendChild(typingWrap);
    scrollBottom();
  }

  function hideTyping() {
    const t = document.getElementById('ss-typing-indicator');
    if (t) t.remove();
  }

  function showBookingCTA() {
    const el = getMessagesEl();
    const cta = document.createElement('a');
    cta.id = 'ss-book-cta';
    cta.href = CONFIG.bookingUrl;
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    cta.innerHTML = `
      <div id="ss-book-cta-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <div id="ss-book-cta-text">
        <div id="ss-book-cta-title">Prenota la consulenza gratuita</div>
        <div id="ss-book-cta-sub">60 minuti · Nessun impegno · Online o a Pescia</div>
      </div>
    `;
    el.appendChild(cta);
    scrollBottom();
  }

  function clearQuickReplies() {
    const el = getQuickEl();
    if (el) el.innerHTML = '';
    quickShown = false;
  }

  function renderQuickReplies() {
    const el = getQuickEl();
    if (!el || !quickShown) return;
    el.innerHTML = '';
    QUICK_REPLIES.forEach(qr => {
      const btn = document.createElement('button');
      btn.className = 'ss-qr';
      btn.textContent = qr.label;
      btn.addEventListener('click', () => {
        clearQuickReplies();
        sendMessage(qr.text);
      });
      el.appendChild(btn);
    });
  }

  /* ─────────────────────────────────────────────
   *  CHIAMATA API ANTHROPIC
   * ───────────────────────────────────────────── */
  async function callAI(userText) {
    if (CONFIG.apiKey === 'INSERISCI_QUI_LA_TUA_CHIAVE_API') {
      // Modalità demo: risposta simulata
      return getDemoResponse(userText);
    }

    messages.push({ role: 'user', content: userText });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true'
      },
      body: JSON.stringify({
        model: CONFIG.model,
        max_tokens: 300,
        system: CONFIG.systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Errore API: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.content[0].text;
    messages.push({ role: 'assistant', content: aiText });
    return aiText;
  }

  /* ─────────────────────────────────────────────
   *  RISPOSTE DEMO (quando non c'è API key)
   * ───────────────────────────────────────────── */
  const demoResponses = [
    `Ciao! Sono Sofia. La SuperSerenità® non è una polizza — è uno stato emotivo. È la libertà di vivere senza quella voce in testa che ti chiede "e se mi succede qualcosa?". Il team di LuniversoTuo ha sviluppato un metodo per arrivarci, costruito attorno alla tua situazione reale. Cosa ti preoccupa di più in questo momento?`,
    `Capisco. È una di quelle domande che a volte si fa fatica anche a dire ad alta voce. Il nostro percorso parte proprio da lì — non da prodotti, ma da quello che tieni più in cuore. Posso chiederti qualcosa in più sulla tua situazione?`,
    `Grazie per avermelo detto. Questo è esattamente il tipo di preoccupazione che Giancarlo e il team affrontano ogni giorno con le famiglie. Una consulenza gratuita di 60 minuti potrebbe darti chiarezza vera — senza impegno, senza pressioni. Vuoi prenotarne una?`
  ];
  let demoIndex = 0;

  function getDemoResponse(text) {
    const resp = demoResponses[Math.min(demoIndex, demoResponses.length - 1)];
    demoIndex++;
    return new Promise(resolve => setTimeout(() => resolve(resp), 1200 + Math.random() * 800));
  }

  /* ─────────────────────────────────────────────
   *  INVIO MESSAGGIO
   * ───────────────────────────────────────────── */
  async function sendMessage(text) {
    text = text.trim();
    if (!text || isTyping) return;

    clearQuickReplies();
    addMessage('user', text);
    isTyping = true;
    showTyping();

    // Azzera il badge
    const badge = document.getElementById('ss-chat-badge');
    if (badge) badge.style.display = 'none';

    try {
      const aiText = await callAI(text);
      hideTyping();
      addMessage('assistant', aiText);

      // Mostra CTA prenotazione dopo 2 scambi
      if (messages.length >= 4 && !document.getElementById('ss-book-cta')) {
        showBookingCTA();
      }
    } catch (err) {
      hideTyping();
      const el = getMessagesEl();
      const errDiv = document.createElement('div');
      errDiv.className = 'ss-error-msg';
      errDiv.textContent = 'Errore di connessione. Riprova o contatta lo studio: 0572 47139';
      el.appendChild(errDiv);
      scrollBottom();
    } finally {
      isTyping = false;
    }
  }

  /* ─────────────────────────────────────────────
   *  OPEN / CLOSE
   * ───────────────────────────────────────────── */
  let isOpen = false;

  function openChat() {
    const panel = document.getElementById('ss-chat-panel');
    const badge = document.getElementById('ss-chat-badge');
    if (panel) panel.classList.add('open');
    if (badge) badge.style.display = 'none';
    isOpen = true;

    if (getMessagesEl().children.length === 0) {
      // Messaggio di benvenuto
      setTimeout(() => {
        showTyping();
        setTimeout(() => {
          hideTyping();
          addMessage('assistant', 'Ciao! Sono Sofia, la consulente virtuale di LuniversoTuo. 😊 Sono qui per aiutarti a capire la SuperSerenità® — e soprattutto per ascoltarti. Da dove vuoi partire?');
          renderQuickReplies();
        }, 900);
      }, 200);
    }

    setTimeout(() => {
      const input = document.getElementById('ss-input');
      if (input) input.focus();
    }, 300);
  }

  function closeChat() {
    const panel = document.getElementById('ss-chat-panel');
    if (panel) panel.classList.remove('open');
    isOpen = false;
  }

  /* ─────────────────────────────────────────────
   *  EVENT LISTENERS
   * ───────────────────────────────────────────── */
  function bindEvents() {
    document.getElementById('ss-chat-btn').addEventListener('click', () => {
      isOpen ? closeChat() : openChat();
    });
    document.getElementById('ss-close-btn').addEventListener('click', closeChat);

    const input = document.getElementById('ss-input');
    const sendBtn = document.getElementById('ss-send-btn');

    sendBtn.addEventListener('click', () => {
      sendMessage(input.value);
      input.value = '';
      input.style.height = 'auto';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
        input.value = '';
        input.style.height = 'auto';
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Chiudi cliccando fuori
    document.addEventListener('click', (e) => {
      if (isOpen && !document.getElementById('ss-chat-widget').contains(e.target)) {
        closeChat();
      }
    });
  }

  /* ─────────────────────────────────────────────
   *  INIT
   * ───────────────────────────────────────────── */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    injectStyles();
    buildWidget();
    bindEvents();
  }

  init();

})();
