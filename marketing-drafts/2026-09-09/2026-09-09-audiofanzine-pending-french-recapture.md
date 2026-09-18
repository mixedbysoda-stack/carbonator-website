# Audiofanzine cohort - French recapture - 2026-09-09
Segment: referrer contains audiofanzine AND verification_status = pending
Size: **21**. List: `segment_audiofanzine_pending_FR.csv`
All 21 were captured in **August 2026**. Every single token is dead. Oldest in the file:
2026-08-25T16:12Z and earlier.

## WHY THIS IS DIFFERENT FROM YESTERDAY'S FRENCH DRAFT
2026-09-08 drafted a French email to **one** lead (monsieurbenjamin@posteo.net) and closed with an
open question: should the pending Audiofanzine cohort get a French recapture? This is that email.
Benjamin is not in this list - he arrived 09-07 and is handled. Do not double-send him.

## SOURCE OF THE COHORT
"Carbonated Audio offre Still", Pauline Bouillaud, Audiofanzine, published 2026-08-18:
https://fr.audiofanzine.com/noise-gate-expandeur-logiciel/carbonated-audio/still/news/a.play,n.82471.html
54 leads all-time from that referrer. It was still delivering traffic on 2026-09-07, three weeks out.

## ACCENTS: DELIBERATE, AND DIFFERENT FROM YESTERDAY
Yesterday's draft was written unaccented to honour the ASCII-clean house rule and flagged the
tradeoff. **Today the rule is waived on purpose.** These recipients came from a French publication;
unaccented French ("telecharge", "reglez", "preampli") reads as machine-generated to a native
speaker, which is exactly the wrong signal for a recapture. Accented French is ordinary UTF-8 and
Resend handles it correctly. This is not the smart-quote / em-dash class of character that mangles.
**Do not run this file through an ASCII cleaner before sending.**

## APD
Still is free. No bundle price, no discount, no promo code, no bundle link. Compliant.

## CTA RULE
The link goes to https://carbonatedaudio.com/still, which mints a **fresh** token.
It must never go to an old confirm/verify URL - `verify-still-download.js` answers those with
HTTP 410 and the recipient concludes the plugin is broken.

---
TO: 21 recipients, see segment_audiofanzine_pending_FR.csv
SUBJECT: Votre lien de téléchargement Still avait expiré

BODY (French):

Bonjour,

Vous avez téléchargé Still en août, sans doute après l'article d'Audiofanzine. Le lien contenu dans
ce premier e-mail n'est valable que 48 heures, et le vôtre a donc expiré depuis longtemps. C'est une
erreur de notre côté : nous n'avions prévu aucun rappel avant l'expiration.

Voici un lien qui fonctionne, sans formulaire et sans compte à créer :

https://carbonatedaudio.com/still

Still reste gratuit, sans limite de durée, sans version d'essai et sans fonction bloquée.

Un conseil de réglage, plus utile qu'un argumentaire : réglez le bouton pendant un silence, pas
pendant la prise. Cherchez un passage où il n'y a que le bruit de fond, montez jusqu'à ce que le
souffle disparaisse, puis redescendez légèrement. Ce réglage tiendra sur toute la prise.

Still est conçu pour le bruit constant : souffle de préampli, ventilateur d'ordinateur,
climatisation, bruit de pièce. Ce n'est pas une porte de bruit, donc les bruits ponctuels restent à
corriger à la main. La latence est nulle, vous pouvez le laisser en place pendant l'enregistrement,
et le bouton delta vous fait écouter exactement ce qui est retiré.

macOS uniquement pour le moment, en VST3 / AU / AAX, signé et notarisé. La version Windows est en
préparation.

Désolé pour le lien mort. Si vous avez un retour, même négatif, il m'intéresse vraiment.

- Soda
Carbonated Audio

---

## ENGLISH GLOSS FOR SODA (do not send this part)
Subject: "Your Still download link had expired". Body: apologises for the dead link, explains the
48-hour expiry as our fault, gives the fresh /still URL, confirms Still is free with nothing locked,
gives the set-during-silence tip, states what Still is for (constant noise, not a gate), notes zero
latency and the delta button, states macOS-only with Windows in progress, asks for feedback.

## SENDING NOTES
- Send as a single French-language batch, separate from the English recapture, so open and bounce
  rates are measurable per language. That comparison is the actual reason to do this.
- Verify each address against `email-suppression.txt` first.
- One address in the segment is `gaechtertristan+carbonatedaudio@gmail.com` - a plus-tagged address.
  Real, deliverable, and a sign of a technical user. Keep it.
- If the French batch outperforms the English one, the next step is already identified: there is no
  French landing page for `/still`, and that article converted 54 people without one.
