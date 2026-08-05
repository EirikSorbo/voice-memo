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

## Lagre notater i en fast mappe i Filer (valgfritt)

Hvert notat har knappen **Lagre som fil**, der du velger om filen skal inneholde
rapporten eller transkripsjonen, og så to veier ut:

- **Arkiver i Filer** åpner delearket. «Arkiver i Filer» der lar deg velge mappe,
  og iOS husker den du brukte sist. Krever ingen oppsett. Skulle iOS avvise
  `.md`, sendes filen som `.txt` med samme innhold. På en datamaskin uten
  deleark lastes filen bare ned.
- **Send til mappe** kjører en snarvei som legger filen rett i en mappe du har
  bestemt, uten mappevelger. Krever engangsoppsettet under.

### Snarveien

1. Åpne **Snarveier** og lag en ny snarvei. Navnet må stemme med feltet nederst
   i eksport-arket i appen (standard: `Lagre notat`).
2. **Hent ordbok fra inndata** (Get Dictionary from Input).
3. **Hent ordbokverdi** (Get Dictionary Value) med nøkkel `filename`, etterfulgt
   av **Angi variabel** (Set Variable) med navn `Filnavn`.
4. **Hent ordbokverdi** en gang til, nå med nøkkel `content`. Sjekk at inndata
   peker på ordboken fra steg 2, ikke på variabelen fra steg 3.
5. **Arkiver fil** (Save File): trykk på mappenavnet i handlingen, som står til
   «Shortcuts» fra før, og velg inbox-mappen (iCloud Drive → Documents →
   Hjelper Hjerne → inbox). Slå av «Spør om arkiveringssted», sett
   «Underbane» til bare variabelen `Filnavn`, og slå på «Overskriv
   eksisterende fil». Mappen i handlingen er utgangspunktet for underbanen, så
   skriver du hele stien i underbanen havner filen i
   `Shortcuts/Documents/Hjelper Hjerne/inbox/` i stedet.

Målmappen er `~/Documents/Hjelper Hjerne/inbox` på Mac-en. Den er nåbar fra
iPhone fordi «Skrivebord og Dokumenter» synkes til iCloud Drive, og ligger der
under `Documents`. Skrus den synkingen av, forsvinner mappen fra telefonen.

Filnavnet blir `2026-08-05-voice-memo-1.md`, der tallet er memoets plass blant
dagens memoer. Tallet kommer fra historikken i Firestore, ikke fra en teller,
så en ny eksport av samme memo overskriver filen i stedet for å lage en ny.
Transkripsjonen får `-transkripsjon` bakpå så den ikke overskriver rapporten.

Appen sender notatet som JSON i `shortcuts://`-URL-en. Er notatet for langt for
en URL (over ~12 000 tegn), legges det på utklippstavlen i stedet og snarveien
kjøres med utklippstavlen som inndata. Samme snarvei håndterer begge tilfellene.

Alternativ uten snarvei: Innstillinger → Apper → Safari → Nedlastinger lar deg
peke ut mappen nedlastinger havner i. Det gjelder alle Safari-nedlastinger, og
er upålitelig når appen kjører fra hjemskjermen.

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
