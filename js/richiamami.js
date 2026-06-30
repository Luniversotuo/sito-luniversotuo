/* ── MODULO "FATTI RICHIAMARE" — LuniversoTuo ──
 * Gestisce ogni form con classe .lt-richiamami-form (Nome + Telefono).
 * All'invio: fa scattare UN evento Lead pulito (browser pixel + CAPI server-side
 * con stesso event_id → deduplicato) e invia i dati a /.netlify/functions/richiamami.
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

  function init() {
    var forms = document.querySelectorAll('.lt-richiamami-form');
    forms.forEach(function (form) {
      var msg = form.querySelector('.lt-rm-msg');
      var btn = form.querySelector('button[type="submit"]');

      function show(text, ok) {
        if (msg) { msg.textContent = text; msg.style.color = ok ? '#4ade80' : '#f87171'; }
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = (form.nome && form.nome.value || '').trim();
        var tel = (form.telefono && form.telefono.value || '').trim();
        var telDigits = tel.replace(/[^0-9]/g, '');

        if (nome.length < 2) { show('Inserisci il tuo nome.', false); return; }
        if (telDigits.length < 8) { show('Inserisci un numero di telefono valido.', false); return; }

        if (btn) { btn.disabled = true; btn.dataset.old = btn.textContent; btn.textContent = 'Invio…'; }

        var eventId = genId();
        // Evento Lead lato browser (deduplica con la CAPI tramite event_id condiviso)
        try { if (window.fbq) fbq('track', 'Lead', { lead_source: 'richiamami' }, { eventID: eventId }); } catch (e) {}
        try { if (window.gtag) gtag('event', 'generate_lead', { method: 'richiamami' }); } catch (e) {}

        fetch('/.netlify/functions/richiamami', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            nome: nome,
            telefono: tel,
            event_id: eventId,
            event_source_url: location.href,
            fbp: ltCookie('_fbp'),
            fbc: ltCookie('_fbc')
          })
        }).then(function () {
          form.reset();
          show('Perfetto ' + nome + ', ti richiamiamo a breve.', true);
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.old || 'Fatti richiamare'; }
        }).catch(function () {
          // L'evento pixel è comunque partito: mostriamo conferma soft
          form.reset();
          show('Richiesta inviata, ti ricontattiamo a breve.', true);
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.old || 'Fatti richiamare'; }
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
