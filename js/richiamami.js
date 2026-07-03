/* ── MODULO "FATTI RICHIAMARE" — LuniversoTuo ──
 * Gestisce ogni form con classe .lt-richiamami-form (Nome + Telefono).
 * Valida il telefono come cellulare italiano (10 cifre, inizia con 3,
 * prefisso +39/0039 opzionale, niente sequenze o cifre tutte uguali).
 * All'invio valido: fa scattare UN evento Lead pulito (browser pixel + CAPI
 * server-side con stesso event_id → deduplicato), invia i dati a
 * /.netlify/functions/richiamami e reindirizza a grazie-richiamo.html.
 * NON scatta nulla sul semplice caricamento pagina: solo su invio reale.
 */
(function () {
  function ltCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : '';
  }
  function genId() {
    return 'lt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* Ritorna le 10 cifre del cellulare (senza prefisso) se valido, altrimenti null. */
  function normalizePhone(raw) {
    var t = String(raw || '').replace(/[^\d+]/g, '');
    if (t.indexOf('+39') === 0) t = t.slice(3);
    else if (t.indexOf('0039') === 0) t = t.slice(4);
    if (t.indexOf('+') !== -1) return null;          // altri prefissi internazionali: non gestiti
    if (!/^3\d{9}$/.test(t)) return null;            // cellulare italiano: 10 cifre, inizia con 3
    if (/^(\d)\1{9}$/.test(t)) return null;          // cifre tutte uguali (3333333333…)
    var distinct = {};
    var asc = true, desc = true;
    for (var i = 0; i < t.length; i++) {
      distinct[t[i]] = true;
      if (i > 0) {
        var d = (10 + t.charCodeAt(i) - t.charCodeAt(i - 1)) % 10;
        if (d !== 1) asc = false;
        if (d !== 9) desc = false;
      }
    }
    if (asc || desc) return null;                    // sequenze tipo 3456789012 o 3210987654
    if (Object.keys(distinct).length < 3) return null; // solo 1-2 cifre diverse: quasi certamente finto
    return t;
  }

  var PHONE_ERR = 'Questo numero non sembra un cellulare italiano. Controlla le cifre (es. 333 1234567) e riprova: ci serve per scriverti su WhatsApp.';

  function init() {
    var forms = document.querySelectorAll('.lt-richiamami-form');
    forms.forEach(function (form) {
      var msg = form.querySelector('.lt-rm-msg');
      var err = form.querySelector('.lt-rm-err') || msg;
      var btn = form.querySelector('button[type="submit"]');
      var telInput = form.telefono;

      function showErr(text) {
        if (err) { err.textContent = text; if (err === msg) err.style.color = '#f87171'; }
        if (telInput) telInput.classList.add('lt-input-error');
      }
      function clearErr() {
        if (err) err.textContent = '';
        if (msg && msg !== err) msg.textContent = '';
        if (telInput) telInput.classList.remove('lt-input-error');
      }

      if (telInput) telInput.addEventListener('input', clearErr);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErr();
        var nome = (form.nome && form.nome.value || '').trim();
        var tel = (form.telefono && form.telefono.value || '').trim();

        if (nome.length < 2) {
          if (err) { err.textContent = 'Inserisci il tuo nome.'; if (err === msg) err.style.color = '#f87171'; }
          if (form.nome) form.nome.focus();
          return;
        }
        var telValid = normalizePhone(tel);
        if (!telValid) {
          showErr(PHONE_ERR);
          if (telInput) telInput.focus();
          return; // il campo nome resta compilato: non facciamo reset
        }

        if (btn) { btn.disabled = true; btn.dataset.old = btn.textContent; btn.textContent = 'Invio…'; }

        var eventId = genId();
        // Evento Lead lato browser (deduplica con la CAPI tramite event_id condiviso)
        try { if (window.fbq) fbq('track', 'Lead', { lead_source: 'richiamami' }, { eventID: eventId }); } catch (e2) {}
        try { if (window.gtag) gtag('event', 'generate_lead', { method: 'richiamami' }); } catch (e2) {}

        fetch('/.netlify/functions/richiamami', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            nome: nome,
            telefono: '+39' + telValid,
            event_id: eventId,
            event_source_url: location.href,
            fbp: ltCookie('_fbp'),
            fbc: ltCookie('_fbc')
          })
        }).then(function (r) {
          if (r && r.status === 400) {
            // Il server ha rifiutato il numero: mostriamo l'errore senza toccare il nome
            if (btn) { btn.disabled = false; btn.textContent = btn.dataset.old || 'Fatti richiamare'; }
            showErr(PHONE_ERR);
            return;
          }
          window.location.href = 'grazie-richiamo.html';
        }).catch(function () {
          // Rete instabile: la richiesta keepalive parte comunque, portiamo alla conferma
          window.location.href = 'grazie-richiamo.html';
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
