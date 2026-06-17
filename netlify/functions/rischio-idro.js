/**
 * Netlify Function: rischio-idro
 * Riceve un indirizzo (comune + via + civico) oppure coordinate (lat/lon),
 * geolocalizza con Nominatim (OpenStreetMap) e interroga i servizi WMS ufficiali
 * ISPRA per ricavare la pericolosità da FRANA e da ALLUVIONE nel punto esatto.
 *
 * Fonti ufficiali (gratuite):
 *  - Geocoding: Nominatim / OpenStreetMap
 *  - Frane:     ISPRA SDI geoserver, layer aree_peric_frana_pai (campo peric_ita)
 *  - Alluvioni: ISPRA SDI geoserver, layer aree_peric_idraulica_p3/p2/p1
 *
 * Risposta JSON: { ok, lat, lon, frana, frana_score, alluvione, alluvione_score, indirizzo }
 */

const FRANE_WMS = "https://sdi.isprambiente.it/geoserver/nz2/ows";
const ALLU_WMS  = "https://sdi.isprambiente.it/geoserver/nz1/ows";

function gfiUrl(base, layer, lon, lat) {
  const d = 0.0004; // ~40 m di buffer attorno al punto
  const bbox = [lon - d, lat - d, lon + d, lat + d].join(",");
  const p = new URLSearchParams({
    service: "WMS", version: "1.3.0", request: "GetFeatureInfo",
    layers: layer, query_layers: layer, styles: "",
    crs: "CRS:84", bbox, width: "101", height: "101", i: "50", j: "50",
    info_format: "text/plain"
  });
  return base + "?" + p.toString();
}

async function getText(url) {
  const r = await fetch(url, { headers: { "User-Agent": "CalcolatoreRischiCasa/1.0 (info@luniversotuo.it)" } });
  return await r.text();
}

function hasFeature(t) {
  return !!t && !/no features were found/i.test(t) && /Results for FeatureType|=/.test(t);
}

// Frana: legge il campo peric_ita e lo normalizza in classe + punteggio
async function getFrana(lon, lat) {
  const t = await getText(gfiUrl(FRANE_WMS, "aree_peric_frana_pai", lon, lat));
  const m = t.match(/peric_ita\s*=\s*(.+)/i);
  if (!m) return { classe: "Nessuna", score: 0 };
  const v = m[1].trim().toLowerCase();
  if (v.includes("p4") || v.includes("molto elevata")) return { classe: "P4 - molto elevata", score: 90 };
  if (v.includes("p3") || v.includes("elevata"))        return { classe: "P3 - elevata",      score: 70 };
  if (v.includes("p2") || v.includes("media"))          return { classe: "P2 - media",        score: 45 };
  if (v.includes("p1") || v.includes("moderata"))       return { classe: "P1 - moderata",     score: 20 };
  if (v.includes("attenzione"))                          return { classe: "Area di attenzione", score: 15 };
  return { classe: m[1].trim(), score: 30 };
}

// Alluvione: scenario piu' gravoso in cui ricade il punto (P3 freq > P2 > P1)
async function getAlluvione(lon, lat) {
  const scen = [
    ["aree_peric_idraulica_p3", "P3 - elevata", 70],
    ["aree_peric_idraulica_p2", "P2 - media",   45],
    ["aree_peric_idraulica_p1", "P1 - bassa",   20]
  ];
  for (const [layer, classe, score] of scen) {
    const t = await getText(gfiUrl(ALLU_WMS, layer, lon, lat));
    if (hasFeature(t)) return { classe, score };
  }
  return { classe: "Nessuna", score: 0 };
}

exports.handler = async (event) => {
  const cors = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*"
  };
  try {
    const q = event.queryStringParameters || {};
    let lat = parseFloat(q.lat), lon = parseFloat(q.lon);
    let indirizzo = "";

    if (!(isFinite(lat) && isFinite(lon))) {
      const parts = [];
      if (q.via)    parts.push((q.via + " " + (q.civico || "")).trim());
      if (q.comune) parts.push(q.comune);
      parts.push("Italia");
      indirizzo = parts.filter(Boolean).join(", ");
      const gu = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=" + encodeURIComponent(indirizzo);
      const gj = await (await fetch(gu, { headers: { "User-Agent": "CalcolatoreRischiCasa/1.0 (info@luniversotuo.it)" } })).json();
      if (!gj || !gj.length) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, reason: "Indirizzo non trovato", indirizzo }) };
      }
      lat = parseFloat(gj[0].lat); lon = parseFloat(gj[0].lon);
      indirizzo = gj[0].display_name || indirizzo;
    }

    const [frana, allu] = await Promise.all([getFrana(lon, lat), getAlluvione(lon, lat)]);

    return {
      statusCode: 200, headers: cors,
      body: JSON.stringify({
        ok: true, lat, lon, indirizzo,
        frana: frana.classe, frana_score: frana.score,
        alluvione: allu.classe, alluvione_score: allu.score
      })
    };
  } catch (e) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: false, reason: String(e && e.message || e) }) };
  }
};
