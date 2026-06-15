/* ── DROPDOWN NAV — LuniversoTuo ── */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var toggles = document.querySelectorAll('.nav__dropdown-toggle');
    toggles.forEach(function(toggle){
      toggle.addEventListener('click', function(e){
        e.preventDefault();
        var parent = toggle.closest('.nav__dropdown');
        var isOpen = parent.classList.contains('open');
        // chiudi tutti
        document.querySelectorAll('.nav__dropdown').forEach(function(d){ d.classList.remove('open'); });
        if (!isOpen) parent.classList.add('open');
      });
    });
    // Hamburger menu (mobile)
    var nav = document.querySelector('.nav');
    var burger = document.querySelector('.nav__burger');
    if (nav && burger) {
      burger.addEventListener('click', function(e){ e.stopPropagation(); nav.classList.toggle('is-open'); });
      nav.querySelectorAll('.nav__menu a').forEach(function(a){
        a.addEventListener('click', function(){
          if (!a.classList.contains('nav__dropdown-toggle')) nav.classList.remove('is-open');
        });
      });
    }
    // chiudi cliccando fuori
    document.addEventListener('click', function(e){
      if (!e.target.closest('.nav__dropdown')) {
        document.querySelectorAll('.nav__dropdown').forEach(function(d){ d.classList.remove('open'); });
      }
      if (nav && !e.target.closest('.nav')) { nav.classList.remove('is-open'); }
    });
  });
})();

/* ── COOKIE BANNER — LuniversoTuo ── */
(function(){
  const KEY = 'lt_cookie_consent';

  function getConsent() { return localStorage.getItem(KEY); }

  function setConsent(val) {
    localStorage.setItem(KEY, val);
    if (val === 'all') loadTrackingScripts();
    hideBanner();
  }

  function loadTrackingScripts() {
    loadFacebookPixel();
    loadClarity();
    loadGA4();
  }

  function hideBanner() {
    const b = document.getElementById('lt-cookie-banner');
    if (b) { b.style.opacity='0'; b.style.transform='translateY(20px)'; setTimeout(()=>b.remove(),400); }
  }

  function loadFacebookPixel() {
    if (window._ltFbLoaded) return;
    window._ltFbLoaded = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','390681561312731');
    fbq('track','PageView');
    // Evento Schedule = prenotazione completata (pagina di ringraziamento)
    if (location.pathname.indexOf('grazie-prenotazione') !== -1) {
      try {
        if (!sessionStorage.getItem('lt_schedule_fired')) {
          fbq('track','Schedule');
          sessionStorage.setItem('lt_schedule_fired','1');
        }
      } catch(e) { fbq('track','Schedule'); }
    }
  }

  // Microsoft Clarity — heatmap e registrazioni sessioni
  function loadClarity() {
    if (window._ltClarityLoaded) return;
    window._ltClarityLoaded = true;
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "x5ys57o520");
  }

  // Google Analytics 4 — inserire l'ID misurazione (es. 'G-AB12CD34EF') qui sotto
  const GA4_ID = 'G-R126YPD0J0';
  function loadGA4() {
    if (!GA4_ID || window._ltGa4Loaded) return;
    window._ltGa4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA4_ID, { 'anonymize_ip': true });
  }

  // Resetta le preferenze (per il pulsante in cookie-policy.html)
  window.resetCookieConsent = function() {
    localStorage.removeItem(KEY);
    location.reload();
  };

  // Pixel Meta: caricato SEMPRE, su ogni pagina, a prescindere dal consenso
  // (scelta esplicita richiesta dal titolare — soluzione temporanea da rivedere)
  loadFacebookPixel();

  // Evento InitiateCheckout = click su un pulsante "Prenota" (inizio prenotazione su Delera).
  // È l'evento intermedio fra PageView (visita) e Schedule (prenotazione completata):
  // intento alto, ma più frequente di Schedule → adatto all'ottimizzazione delle campagne.
  // Delegato sull'intero documento: copre TUTTI i pulsanti/link di prenotazione di OGNI pagina.
  (function trackPrenotaClicks(){
    if (window._ltPrenotaTracked) return;
    window._ltPrenotaTracked = true;
    document.addEventListener('click', function(e){
      var link = e.target.closest && e.target.closest('a[href*="link.delera.co/widget/booking"]');
      if (!link) return;
      try { if (window.fbq) fbq('track','InitiateCheckout'); } catch(err) {}
      try { if (window.gtag) gtag('event','click_prenota'); } catch(err) {}
    }, true);
  })();

  // Se già deciso, applica la scelta
  const saved = getConsent();
  if (saved === 'all') { loadTrackingScripts(); return; }
  if (saved === 'essential') { return; }

  // Nessuna scelta → mostra il banner
  const css = `
    #lt-cookie-banner {
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      width:calc(100% - 40px); max-width:680px; z-index:99999;
      background:#13151f; border:0.5px solid rgba(37,99,235,0.35);
      border-radius:16px; padding:20px 22px; box-shadow:0 20px 60px rgba(0,0,0,0.6);
      display:flex; align-items:center; gap:16px; flex-wrap:wrap;
      font-family:'Inter',ui-sans-serif,system-ui,sans-serif;
      transition:opacity 0.4s, transform 0.4s;
    }
    #lt-cookie-banner p {
      flex:1; min-width:200px; margin:0;
      font-size:13px; line-height:1.6; color:rgba(255,255,255,0.6);
    }
    #lt-cookie-banner p a { color:rgba(147,186,255,0.9); text-decoration:underline; }
    #lt-cookie-banner strong { color:rgba(255,255,255,0.85); }
    .lt-cb-btns { display:flex; gap:8px; flex-shrink:0; }
    .lt-cb-btn { border:none; border-radius:10px; padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:background 0.15s; white-space:nowrap; }
    .lt-cb-btn-all { background:#2563EB; color:#fff; }
    .lt-cb-btn-all:hover { background:#1d4ed8; }
    .lt-cb-btn-ess { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.6); border:0.5px solid rgba(255,255,255,0.12); }
    .lt-cb-btn-ess:hover { background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.85); }
    @media(max-width:500px){
      #lt-cookie-banner { flex-direction:column; align-items:flex-start; bottom:0; left:0; right:0; width:100%; max-width:100%; border-radius:16px 16px 0 0; transform:none; }
      .lt-cb-btns { width:100%; }
      .lt-cb-btn { flex:1; text-align:center; }
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.id = 'lt-cookie-banner';
  banner.innerHTML = `
    <p>
      Usiamo <strong>cookie tecnici</strong> necessari al funzionamento del sito e, con il tuo consenso, <strong>cookie statistici e di marketing</strong> (Facebook Pixel, Microsoft Clarity, Google Analytics) per misurare visite e campagne.
      Leggi la nostra <a href="cookie-policy.html">Cookie Policy</a>.
    </p>
    <div class="lt-cb-btns">
      <button class="lt-cb-btn lt-cb-btn-ess" onclick="window._ltSetConsent('essential')">Solo essenziali</button>
      <button class="lt-cb-btn lt-cb-btn-all" onclick="window._ltSetConsent('all')">Accetta tutti</button>
    </div>
  `;
  document.body.appendChild(banner);

  window._ltSetConsent = setConsent;
})();
