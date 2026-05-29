# Come attivare Sofia — l'AI del sito LuniversoTuo

Sofia è già installata sul sito e funziona in **modalità demo** con risposte pre-scritte.
Per attivarla con l'intelligenza artificiale reale (Claude di Anthropic), segui questi 3 passi.

---

## Passo 1 — Crea il tuo account Anthropic

1. Vai su: **https://console.anthropic.com**
2. Clicca "Sign Up" e crea un account (usa la tua email info@luniversotuo.it)
3. Verifica l'email

---

## Passo 2 — Crea la chiave API

1. Una volta dentro la console, vai su **"API Keys"** nel menu a sinistra
2. Clicca **"Create Key"**
3. Dai un nome (es. "Sofia LuniversoTuo")
4. Copia la chiave — inizia con `sk-ant-...`
   > **Importante:** copiala subito, non la mostra più dopo!
5. Aggiungi un metodo di pagamento (carta di credito)
   - Il costo è ~$0,25 ogni 1.000 conversazioni con Sofia
   - Per una piccola agenzia: stimiamo 5-15€/mese massimo

---

## Passo 3 — Inserisci la chiave nel sito

Devi modificare **2 file** (uno per il widget floating, uno per la pagina chat):

### File 1: `js/chat-widget.js`
Apri il file con TextEdit o qualsiasi editor.
Cerca questa riga (è all'inizio del file):

```
apiKey: 'INSERISCI_QUI_LA_TUA_CHIAVE_API',
```

Sostituisci con la tua chiave reale:

```
apiKey: 'sk-ant-xxxxxxxxxxxxxxxx',
```

### File 2: `chat.html`
Apri il file, cerca la stessa riga:

```
apiKey: 'INSERISCI_QUI_LA_TUA_CHIAVE_API',
```

Sostituisci con la stessa chiave.

---

## Risultato

Dopo la modifica, Sofia risponderà con l'intelligenza artificiale reale di Claude —
sempre con il tono caldo, empatico e orientato alla SuperSerenità® che abbiamo impostato.

---

## Domande frequenti

**Quanto costa davvero?**
Il modello usato è `claude-haiku` (il più veloce ed economico). Una conversazione di 5 messaggi
costa circa €0,002 (due millesimi di euro). Con 200 conversazioni al mese: ~0,40€.

**È sicuro mettere la chiave nel file?**
Per ora sì — il sito ha traffico limitato e la chiave può avere un budget massimo impostato
dalla console Anthropic. In futuro, quando il sito andrà su WordPress, il tecnico può
spostare la chiave su un server backend (più sicuro). Per ora è ok.

**Sofia può dire cose sbagliate?**
È istruita per non dare mai dati tecnici specifici e per invitare sempre alla consulenza reale.
Tuttavia, come tutte le AI, può sbagliare. Per questo in fondo alla pagina chat c'è la nota:
"Sofia è un'intelligenza artificiale. Per decisioni importanti, prenota una consulenza con il team reale."

**Posso cambiare cosa dice Sofia?**
Sì. Il "cervello" di Sofia è il `systemPrompt` nel file `js/chat-widget.js`. Puoi modificarlo
o chiedere a Claude di aggiornarlo quando vuoi.

---

*File creato da Claude · LuniversoTuo · Maggio 2026*
