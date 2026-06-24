/**
 * Netlify Function: rischio-azienda
 * Recupera i dati ufficiali di un'azienda dal Registro Imprese tramite l'API
 * "Dettaglio Azienda" di ReportAziende.it, a partire da Partita IVA / Codice Fiscale.
 * Alimenta il "Calcolatore Analisi Rischi Azienda 360°".
 *
 * API ReportAziende — endpoint sincrono (real-time), 1 credito a scheda:
 *   GET https://api.reportaziende.it/dettaglioazienda/visualizza/{CF}/{CODICE_SCHEDA}
 *   Header: Authorization: Bearer <token>
 *
 * Schede usate dal calcolatore:
 *   ANA  → anagrafica: ragione_sociale, natura_giuridica, ateco, sede_legale
 *   05   → quadro aziendale (per anno): fatturato, numero_dipendenti, utile, costo_personale
 *   10   → conto economico (per anno): ricavi_operativi, margine_operativo_lordo_ebitda,
 *          costo_del_personale, costo_per_servizi, costo_per_godimento_di_beni_di_terzi,
 *          oneri_diversi_di_gestione
 *   30   → stato patrimoniale passivo (per anno): patrimonio_netto, fondo_tfr
 *
 * Costo per azienda: con bilancio = ANA+05+10+30 = 4 crediti; senza bilancio = ANA+05 = 2 crediti.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAZIONE (unico passaggio manuale):
 *   Su Netlify → Site settings → Environment variables, aggiungi:
 *     REPORTAZIENDE_TOKEN = il token Bearer fornito da ReportAziende per la tua API
 *   Senza token la funzione risponde con un messaggio chiaro e il calcolatore
 *   resta usabile in inserimento manuale.
 *
 * NOTA: i NOMI dei campi seguono il manuale ReportAziende. La sola cosa da
 * confermare alla prima chiamata reale è la NIDIFICAZIONE dei dati "per anno"
 * (array vs oggetto per anno): il parser latestRecord() la gestisce in modo difensivo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TOKEN = process.env.REPORTAZIENDE_TOKEN || "";
const BASE  = "https://api.reportaziende.it";

const CORS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*"
};
const reply = (obj, status = 200) => ({ statusCode: status, headers: CORS, body: JSON.stringify(obj) });

/* Chiamata a una singola scheda. Ritorna {ok, dati} oppure {ok:false, code}. */
async function scheda(cf, code) {
  const url = BASE + "/dettaglioazienda/visualizza/" + encodeURIComponent(cf) + "/" + encodeURIComponent(code);
  let r, json;
  try {
    r = await fetch(url, { headers: { "Authorization": "Bearer " + TOKEN, "Accept": "application/json" } });
    json = await r.json();
  } catch (e) {
    return { ok: false, code: "ERRORE_RETE" };
  }
  if (json && json.status === "ok") return { ok: true, dati: json.dati != null ? json.dati : json };
  return { ok: false, code: (json && json.error_code) || "ERRORE", message: json && json.message };
}

/* Numero "sicuro" da stringa/numero. I dati ReportAziende sono grezzi (senza simboli),
   ma gestiamo comunque sia il punto-decimale (1234567.89) sia il formato IT (1.234.567,89). */
function num(v) {
  if (v == null || v === "" || v === "n.d.") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/[^\d.,-]/g, "");
  if (s.indexOf(",") > -1 && s.indexOf(".") > -1) s = s.replace(/\./g, "").replace(",", "."); // 1.234.567,89
  else if (s.indexOf(",") > -1) s = s.replace(",", ".");                                       // 1234567,89
  const n = parseFloat(s);                                                                      // 1234567 / 1234567.89
  return isFinite(n) ? n : 0;
}
/* Primo valore presente tra più nomi possibili */
function pick(o, keys) {
  if (!o) return null;
  for (const k of keys) if (o[k] != null && o[k] !== "" && o[k] !== "n.d.") return o[k];
  return null;
}

/* Da una scheda "per anno" estrae il record più recente, gestendo varie nidificazioni:
   - array di record  → ultimo (i dati sono in ordine cronologico crescente)
   - oggetto con un array dentro (anni/esercizi/records/righe/bilanci...)
   - oggetto con chiavi-anno ("2023": {...})
   - oggetto singolo record */
function latestRecord(dati) {
  if (dati == null) return null;
  if (Array.isArray(dati)) return dati.length ? dati[dati.length - 1] : null;
  if (typeof dati === "object") {
    for (const key of ["anni", "esercizi", "records", "righe", "bilanci", "dati", "items", "lista"]) {
      if (Array.isArray(dati[key]) && dati[key].length) return dati[key][dati[key].length - 1];
    }
    const yearKeys = Object.keys(dati).filter(k => /^\d{4}$/.test(k));
    if (yearKeys.length) return dati[yearKeys.sort()[yearKeys.length - 1]];
    return dati; // record singolo
  }
  return null;
}
function anno(rec) {
  const d = pick(rec || {}, ["data", "anno", "data_chiusura", "esercizio"]);
  if (!d) return "";
  const m = String(d).match(/(\d{4})/);
  return m ? m[1] : String(d);
}

/* Forme che NON depositano bilancio completo */
function depositaBilancio(forma) {
  const f = (forma || "").toUpperCase();
  if (!f) return null;
  const senza = ["DITTA INDIVIDUALE", "IMPRESA INDIVIDUALE", "S.N.C", "SNC", "S.A.S", "SAS",
                 "SOCIETA' SEMPLICE", "SOCIETA SEMPLICE", "LIBERO PROFESSIONISTA", "STUDIO"];
  if (senza.some(s => f.includes(s))) return false;
  const con = ["S.R.L", "SRL", "RESPONSABILITA", "S.P.A", "SPA", "PER AZIONI",
               "S.A.P.A", "SAPA", "COOPERATIVA", "SOC. COOP", "CONSORZIO"];
  if (con.some(s => f.includes(s))) return true;
  return null;
}

/* ATECO può essere stringa o oggetto {codice, descrizione} */
function atecoCode(a) {
  if (!a) return "";
  if (typeof a === "string") return a;
  return a.codice || a.code || "";
}

function errToReason(code) {
  if (code === "AZIENDA_NON_TROVATA") return "Azienda non presente in archivio.";
  if (code === "TOKEN_NON_VALIDO" || code === "TOKEN_SCADUTO" || code === "PERMESSO_NEGATO" || code === "SCHEDA_NON_AUTORIZZATA")
    return "Token ReportAziende non valido o non abilitato a questa scheda.";
  if (code === "CREDITI_INSUFFICIENTI" || code === "LIMITE_GIORNALIERO_SUPERATO" || code === "LIMITE_MENSILE_SUPERATO")
    return "Crediti/limiti ReportAziende esauriti.";
  if (code === "DATI_NON_DISPONIBILI") return "Dati non disponibili per questa azienda.";
  return "Dato non disponibile.";
}

/* ----- ANAGRAFICA: 1 sola scheda ANA = 1 credito (€0,15) ----- */
async function anagrafica(cf) {
  const ana = await scheda(cf, "ANA");
  if (!ana.ok) return reply({ ok: false, reason: errToReason(ana.code) });

  const a = ana.dati || {};
  const ateco = atecoCode(pick(a, ["ateco"]));
  const sede  = (a && typeof a.sede_legale === "object") ? a.sede_legale : a;

  return reply({
    ok: true,
    fonte: "Registro Imprese · ReportAziende",
    nome:  pick(a, ["ragione_sociale", "denominazione"]) || "",
    forma: pick(a, ["natura_giuridica", "forma_giuridica"]) || "",
    ateco: ateco || "",
    comune:    pick(sede, ["comune", "citta"]) || "",
    provincia: pick(sede, ["provincia", "prov", "sigla_provincia"]) || "",
    regione:   pick(sede, ["regione"]) || "",
    deposita_bilancio: depositaBilancio(pick(a, ["natura_giuridica", "forma_giuridica"])),
    crediti_usati: 1
  });
}

/* ----- BILANCIO: schede 10 + 30 = 2 crediti (€0,30), solo su richiesta ----- */
async function bilancio(cf) {
  const [ce, sp] = await Promise.all([scheda(cf, "10"), scheda(cf, "30")]);
  if (!ce.ok && !sp.ok) return reply({ ok: false, reason: errToReason(ce.code || sp.code) });

  const rce = ce.ok ? latestRecord(ce.dati) : null;
  const rsp = sp.ok ? latestRecord(sp.dati) : null;

  const bil = {
    anno: anno(rce) || anno(rsp) || "",
    fatturato:        num(pick(rce || {}, ["ricavi_operativi", "fatturato", "ricavi_e_proventi"])),
    ebitda:           num(pick(rce || {}, ["margine_operativo_lordo_ebitda", "ebitda", "margine_operativo_lordo"])),
    costo_personale:  num(pick(rce || {}, ["costo_del_personale", "costo_personale"])),
    costo_servizi:    num(pick(rce || {}, ["costo_per_servizi"])),
    costo_godimento:  num(pick(rce || {}, ["costo_per_godimento_di_beni_di_terzi"])),
    oneri_diversi:    num(pick(rce || {}, ["oneri_diversi_di_gestione"])),
    patrimonio:       num(pick(rsp || {}, ["patrimonio_netto"])),
    tfr:              num(pick(rsp || {}, ["fondo_tfr"]))
  };
  return reply({ ok: true, fonte: "Registro Imprese · ReportAziende", bilancio: bil, fatturato: bil.fatturato || null, crediti_usati: 2 });
}

/* ===================== HANDLER ===================== */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  if (!TOKEN) {
    return reply({ ok: false, reason: "Servizio dati non ancora configurato (manca REPORTAZIENDE_TOKEN su Netlify). Inserimento manuale disponibile." });
  }

  try {
    const q = event.queryStringParameters || {};
    const cf = (q.piva || q.cf || "").replace(/\s/g, "").toUpperCase();
    if (!cf || (cf.length !== 11 && cf.length !== 16)) {
      return reply({ ok: false, reason: "Codice Fiscale / P.IVA non valido (11 o 16 caratteri)." });
    }
    const action = q.action || "anagrafica";
    if (action === "bilancio") return await bilancio(cf);   // 2 crediti, on-demand
    return await anagrafica(cf);                            // 1 credito, default
  } catch (e) {
    return reply({ ok: false, reason: String((e && e.message) || e) });
  }
};
