# Follow-up drafts — 2026-09-13

**NOTHING HAS BEEN SENT. NO GMAIL DRAFT WAS CREATED.** See the note at the bottom for why not.

APD window is active (ends 2026-09-14T23:59:59Z). Every draft below is Still-only: free product, no
bundle, no price, no promo code, no bundle link, no urgency. CTA is always
`https://carbonatedaudio.com/still`, which mints a fresh 48h token — never an old confirm URL,
which answers HTTP 410.

Only **one** email is warranted today. The delta was 4 rows / 2 contacts, and three of the four are
either already verified, bounced, or disposable.

---

## 1. pieri.federico@ymail.com — Italian, second-failure copy

**Why this and not the standard recapture:** he received the standard recapture on 09-12T22:48Z,
acted on it 13 minutes later, and it failed again. Asking a third time would be tone-deaf and would
not work. This email stops asking and offers to resolve it directly. It mirrors the approach already
used with `enewsom@gmail.com` on 09-12.

TO: pieri.federico@ymail.com
SUBJECT: Still — lascia che me ne occupi io

BODY:

Ciao,

Hai richiesto Still due volte, il 10 settembre e di nuovo ieri sera, e in entrambi i casi la
conferma non è andata a buon fine. Hai fatto esattamente quello che ti avevo chiesto e il problema
è rimasto: quindi è un problema nostro, non tuo, e non ti chiedo di riprovare una terza volta.

Il motivo più probabile è che le nostre email di conferma non arrivino fino alla tua casella. Vale
la pena controllare la cartella spam, ma se non c'è nulla non insistere.

Rispondi a questo messaggio e ti mando io il link diretto, senza passare dal modulo. Se preferisci,
indicami un altro indirizzo e lo uso per quello.

Still resta gratuito, senza limiti di tempo e senza funzioni bloccate. Per ora è solo macOS
(VST3 / AU / AAX); la versione Windows è in lavorazione.

Scusa per il giro a vuoto.

— Soda
Carbonated Audio

**Note:** accented Italian is intentional — do not run it through an ASCII cleaner. Same rule as the
09-11 Italian batch and the 09-09 French batch.

**English gloss (do not send):** You asked for Still twice, Sep 10 and last night, and the
confirmation failed both times. You did what I asked and it still broke, so it is our problem, not
yours, and I am not asking you to do it a third time. Most likely our confirmation mail is not
reaching your inbox — worth a spam-folder check, but do not chase it. Reply here and I will send the
link directly, or give me another address and I will use that. Still is free, nothing locked, macOS
only for now, Windows in progress. Sorry for the runaround.

---

## 2. Audiofanzine French batch — already drafted, still valid, send as-is

Do not rewrite. `marketing-drafts/2026-09-09/2026-09-09-audiofanzine-pending-french-recapture.md`
plus `segment_audiofanzine_pending_FR.csv` (21 recipients).

Re-verified today: all 21 still never-verified, none converted, none left the database, copy still
accurate, still APD-safe. It has been sitting unsent for four days.

**Do not widen it to the 32 audiofanzine never-verified contacts.** The extra 11 are pre-verification
`None`-status rows that already received the full three-email drip. Telling them their confirmation
failed would be false.

---

## 3. No email — with reasons

- `renato.ravarino@gmail.com` — verified on first attempt 09-13, drip running. Nothing to fix.
- `gino.pasquini@alice.it` — verified 09-13T00:18Z, 90 min after our Italian recapture. It worked.
  Exclude from all future recapture segments.
- `heyjoe@cj.mintemail.com` — disposable mailbox provider, referred from `web.telegram.org`.
- `freefrqncesco81@gmail.com` — hard bounce, 550 5.1.1, address does not exist.

---

## Why there is no Gmail draft this time

On 09-11 three recapture emails were written as Gmail drafts and recorded as "not sent." They were
sent the following night at 22:48Z. That is fine in itself — but by then one recipient's status had
changed, and the batch was sent without re-checking. It happened to land well: `gino.pasquini`
verified 90 minutes later.

The next one may not. `pieri.federico` is one verification event away from the email above becoming
wrong, and he is demonstrably active right now. A file has to be read before it can be sent; a Gmail
draft can go out on its own.

Recommendation: re-check `list-leads` for `pieri.federico@ymail.com` immediately before sending, and
skip it if he has verified in the meantime.

---

## Suggested fixes surfaced by today's data

1. Add `freefrqncesco81@gmail.com` to `email-suppression.txt` **and** to
   `netlify/functions/lib/suppression.js` — the file itself says keep both in sync.
2. Add `mintemail.com` to `DISPOSABLE_EMAIL_DOMAINS` in `netlify/functions/capture-lead.js`.
3. Case-normalize `contact` on write or on count. `reeft@free.fr` and `Reeft@free.fr` are one person
   counted twice, and they are also in the audiofanzine cohort, so that person can be double-sent.
4. Fix the comment above `START`/`END` in `components/apd-window.js` — it states 08-31 → 09-13 while
   the constants say 08-30 → 09-14.
5. Send a reminder before the 48h token lapses. Every pending lead in this database got exactly one
   email and then the token died silently. That is the root cause of a 370-contact never-verified
   backlog, and no amount of recapture copy fixes it.
