# Voice Memo — oppsett

Appen er én statisk `index.html` — ingen server. Den bruker Firebase AI Logic
(Gemini) til å gjøre lydopptak om til strukturerte rapporter, og Firestore til
historikk. Alt fungerer på Firebase sin gratisplan (Spark) uten betalingskort.

## Firebase-konsollen (engangsoppsett, ~5 min)

1. **Opprett prosjekt:** [console.firebase.google.com](https://console.firebase.google.com)
   → *Add project* → f.eks. `voice-memo` → Google Analytics **av**.

2. **Aktiver AI:** Venstremenyen → *Firebase AI Logic* → *Get started* →
   velg **Gemini Developer API** (gratisnivået — IKKE Vertex AI, som krever kort).

3. **Aktiver innlogging:** *Authentication* → *Get started* → *Sign-in method* →
   **Google** → Enable (velg support-e-posten din).

4. **Opprett database:** *Firestore Database* → *Create database* →
   *Start in production mode* → region `eur3 (europe-west)` → *Create*.
   Gå så til *Rules*-fanen, lim inn innholdet fra `firestore.rules` → *Publish*.

5. **Hent config:** Tannhjulet → *Project settings* → *Your apps* →
   web-ikonet `</>` → registrer appen (uten Hosting-haken) → kopier
   `firebaseConfig`-objektet → lim det inn øverst i `<script>`-blokken i
   `index.html` (blokken er tydelig markert).

## Publisering

GitHub Pages på dette repoet: *Settings* → *Pages* → *Deploy from a branch* →
`main` / root. Appen ligger da på `https://eiriksorbo.github.io/voice-memo/`.

Til slutt: *Authentication* → *Settings* → *Authorized domains* →
*Add domain* → `eiriksorbo.github.io` (ellers nekter Google-innloggingen).

## Verdt å vite

- **Modellnavn:** Konstanten `GEMINI_MODEL` øverst i `index.html` styrer
  hvilken Gemini-modell som brukes. Får du «modellen finnes ikke»-feil,
  bytt til f.eks. `gemini-2.5-flash`.
- **Kvote:** Gratisnivået gir ~1500 forespørsler/dag — mer enn nok.
  Merk at Google kan bruke data sendt på gratisnivået til produktforbedring.
- **Gamle rapporter:** Første gang du logger inn i en nettleser som har
  rapporter fra den gamle versjonen (localStorage), importeres de automatisk
  til Firestore.
- **Opptakslengde:** Maks ~14 MB lyd per memo (godt over en halvtime tale).
- **Senere (valgfritt):** App Check med reCAPTCHA kan skrus på i konsollen for
  å hindre at andre nettsteder bruker AI-kvoten din.
