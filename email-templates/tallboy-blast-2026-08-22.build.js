// TALLBOY launch blast - builds branded HTML + plaintext for each contact.
const fs = require("fs");
const { buildEmail } = require("./render");

const URL = "https://carbonatedaudio.com/tallboy";

const FEATURES = [
  "CHIP 4CH RESYNTH - tracks pitch and envelope, rebuilds it on four modelled channels (two pulse, 4-bit wavetable, LFSR noise)",
  "ARP + GLIDE SEQUENCER - host-synced 1/4 to 1/32, five modes, one to four octaves, portamento to 400 ms",
  "CRUSH ROM DECIMATOR - 1 to 16 bits, rate divide 1-64 with jitter, post filter 18 kHz down to 540 Hz",
  "Each cartridge inserts or ejects independently. All three out and it passes audio untouched",
  "No knobs - a D-pad and a four-shade dot-matrix screen, six parameters per cartridge",
  "$20 one-time, 3 machines, no iLok, no subscription, works offline after one activation",
];

const SPECS = "VST3, AU and AAX on macOS (universal, Pro Tools signed). VST3 on Windows, 64-bit. Free demo, no email required, 60 seconds of audio then 10 seconds of mute on a loop.";

const p = (t) => `<p style="color:#a09bb5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;margin:0 0 16px;">${t}</p>`;

// ---------------------------------------------------------------
// Each entry: to, cc, subject, preheader, variant, headline, paras, plain
// ---------------------------------------------------------------
const CONTACTS = [

  // ============ MARKETPLACES ============
  {
    key: "adsr",
    to: ["gage@adsrsounds.com"],
    subject: "July report question + a new one out: TALLBOY",
    preheader: "Answering your report question, plus a new release for after Back to Studio.",
    variant: "spotlight",
    name: "Gage",
    headline: "TALLBOY - a chiptune resynthesiser, out now",
    paras: [
      "Two things, and neither one changes anything about Back to Studio.",
      "First, your question from last week: I have not received the July sales report yet. Whenever whoever handles those has a minute, I would appreciate it.",
      "Second, we shipped a new plugin: TALLBOY. It tracks the pitch of whatever you feed it and replays that performance through a four-channel console sound chip. It is not a filter over the top, it is an actual chip voice following your line. Three cartridges you insert or eject independently: the resynth engine, a tempo-synced arp, and a bit and sample-rate decimator that works on anything.",
      "I am not asking you to squeeze it into the Back to Studio sale. You already said you are at capacity and Aug 24 to Sep 7 stands exactly as we agreed: FIZZFUEL at $19.99 and Carbonator at $19.99.",
      "This is just a heads up so it is on your radar for the catalog after the sale wraps. Whenever you have room, I can send the installer and a batch of keys the same way I did for Carbonator.",
    ],
  },
  {
    key: "apd",
    to: ["joe@audioplugin.deals"],
    cc: ["yemi@audioplugin.deals"],
    subject: "New release: TALLBOY - heads up ahead of the Aug 31 window",
    preheader: "New plugin out. Not asking to change the 4-in-1 - just putting it on your radar.",
    variant: "spotlight",
    name: "Joe",
    headline: "TALLBOY - a chiptune resynthesiser, out now",
    paras: [
      "Quick one, and I want to be clear up front that this does not touch the Aug 31 to Sep 13 campaign. The 4-in-1 Bundle is locked exactly as we agreed: Carbonator, De-Sipper, On Tap and FIZZFUEL.",
      "We just released TALLBOY. It tracks the pitch of your audio and replays that performance through a four-channel console sound chip, then arpeggiates and decimates it. Three cartridges, each independently insertable, driven from a D-pad and a dot-matrix screen instead of knobs.",
      "It is a very different animal from the rest of the catalog, which is why I think it demos well. Every other plugin we make is a mix tool. This one changes what the source is.",
      "No ask attached right now. Once the 4-in-1 finishes on Sep 13 and we see how it lands, worth a conversation about whether TALLBOY works as a standalone feature or as part of a refreshed bundle.",
    ],
  },
  {
    key: "pluginboutique",
    to: ["support@pluginboutiquesupport.zendesk.com"],
    subject: "Re: indie saturation plugin worth a look - new release TALLBOY (#1586535)",
    preheader: "Seventh release from us. Same onboarding thread, new hook.",
    variant: "spotlight",
    name: "Joshua",
    headline: "TALLBOY - a chiptune resynthesiser, out now",
    paras: [
      "Coming back to ticket #1586535 with something genuinely new rather than another bump.",
      "We released TALLBOY. It tracks the pitch and envelope of your input and rebuilds it on four modelled console sound chip channels, then runs it through a tempo-synced arpeggiator and a bit and sample-rate decimator. Three cartridges, each one insertable or ejectable on its own, driven from a D-pad and a dot-matrix display rather than knobs.",
      "That brings Carbonated Audio to seven released plugins since we first opened this thread: Carbonator, De-Sipper, On Tap, Pour, FIZZFUEL, Still (free) and now TALLBOY. All macOS universal and Pro Tools signed, all Windows VST3, all one-time purchase.",
      "If the catalog size was the blocker, it is not a one-plugin pitch any more. If something else is the blocker, I would rather hear that plainly than keep the ticket open.",
    ],
  },
  {
    key: "producerspot",
    to: ["info@producerspot.com"],
    subject: "New release from Carbonated Audio - TALLBOY, chiptune resynth ($20)",
    preheader: "News item ready to run, plus a standing listing offer.",
    variant: "spotlight",
    headline: "TALLBOY - a chiptune resynthesiser, out now",
    paras: [
      "Hey ProducerSpot team,",
      "I sent over FIZZFUEL and Still back on Aug 4. Here is a third, and it is the most unusual thing we have built.",
      "TALLBOY tracks the pitch of whatever you feed it and replays that performance through a four-channel console sound chip. Not a filter over the top, an actual chip voice following your line. Then a tempo-synced arpeggiator spreads it across octaves and a decimator crushes it. Three cartridges, each one insertable independently, controlled with a D-pad and a dot-matrix screen.",
      "Happy for you to run it as a news item, and the offer to list our catalog on your marketplace still stands whenever you want to take it up. I can send installers, keys and assets same day.",
    ],
  },
  {
    key: "vstalarm",
    to: ["edgar@vstalarm.com"],
    subject: "New from Carbonated Audio - TALLBOY, chiptune resynth ($20)",
    preheader: "Following the FIZZFUEL note from July with something more unusual.",
    variant: "spotlight",
    name: "Edgar",
    headline: "TALLBOY - a chiptune resynthesiser, out now",
    paras: [
      "I sent a deal idea for FIZZFUEL back in July and did not hear back, which is fine. Circling back with something that I think fits your audience better anyway.",
      "TALLBOY tracks the pitch of your audio and replays that performance through a four-channel console sound chip, then arpeggiates and decimates it. Three cartridges, each one insertable or ejectable on its own, driven from a D-pad and a dot-matrix screen instead of knobs.",
      "$20 one-time, no subscription, no iLok, three machines. Free demo with no email required.",
      "If a deal is interesting I am flexible on pricing and timing. If it is not the right fit, just say so and I will stop bothering you.",
    ],
  },
  {
    key: "kvr",
    to: ["contactus@kvraudio.com"],
    subject: "TALLBOY by Carbonated Audio - posted to our KVR dashboard",
    preheader: "New product added via the developer dashboard. Newsletter consideration if it fits.",
    variant: "personal",
    name: "KVR team",
    paras: [
      "Following your note in August about the developer dashboard: I am adding TALLBOY there myself rather than sending it in as a submission.",
      "TALLBOY is a chiptune resynthesiser and bitcrusher. It tracks the pitch and envelope of the incoming audio and rebuilds it on four modelled console sound chip channels, then runs a tempo-synced arpeggiator and a bit and sample-rate decimator behind it. Three cartridges, each insertable on its own. VST3, AU and AAX on macOS, VST3 on Windows. $20 one-time.",
      `Product page: <a href="${URL}" style="color:#c2d24f;">${URL}</a>`,
      "Only ask, and no pressure on it: if it fits a newsletter or front page slot, we would appreciate the look. A free press licence is available any time you want one.",
    ],
  },

  // ============ PRESS ============
  {
    key: "rekkerd",
    to: ["ronnie@rekkerd.org"],
    subject: "New Carbonated Audio release - TALLBOY, chiptune resynth ($20)",
    preheader: "Fifth time asking, and this one is the strangest thing we have made.",
    variant: "personal",
    name: "Ronnie",
    paras: [
      "Thanks again for the FIZZFUEL and Still coverage earlier this month. You have been the most consistent supporter we have, and I do not take it for granted.",
      "New one out: TALLBOY. It is the most unusual thing we have built.",
      "It tracks the pitch and envelope of whatever you feed it and rebuilds that performance on four modelled console sound chip channels - two pulse channels with four duty cycles, a 32-sample 4-bit wavetable, and LFSR noise keyed off transients. Not a filter over the top of your audio, an actual chip voice following your line. Behind that sit a tempo-synced arpeggiator and a bit and sample-rate decimator, each one a separate cartridge you insert or eject on its own.",
      "There are no knobs. You drive it with a D-pad and a four-shade dot-matrix display, six parameters per cartridge.",
      `$20 one-time, three machines, no iLok, no subscription. VST3, AU and AAX on macOS, universal and Pro Tools signed. VST3 on Windows, 64-bit. Free demo, no email required - 60 seconds of audio then 10 seconds of mute on a loop. The demo is macOS VST3 and AU only; if you need Windows or AAX to test, say the word and I will send you a full licence.`,
      `Page with audio demos: <a href="${URL}" style="color:#c2d24f;">${URL}</a>`,
      "Assets, screenshots or a licence key whenever you want them.",
    ],
  },
  {
    key: "audionewsroom",
    to: ["info@audionewsroom.net"],
    subject: "Press Release - Carbonated Audio releases TALLBOY, a chiptune resynthesiser ($20)",
    preheader: "Press release format, ready to run.",
    variant: "personal",
    name: "Fab",
    paras: [
      "Thanks for the Carbonator, Tonic and FIZZFUEL coverage this year. New release below in press release format so you can lift it straight out.",
      "<strong style=\"color:#ffffff;\">Carbonated Audio releases TALLBOY, a chiptune resynthesiser and bitcrusher</strong>",
      "TALLBOY is a pitch-tracking resynthesiser that replays incoming audio through a four-channel console sound chip. Rather than filtering or degrading the source, it follows the pitch and envelope of the input and rebuilds the performance on modelled hardware channels: two pulse channels with four duty cycles, a 32-sample 4-bit wavetable, and 15/7-bit LFSR noise keyed off transients.",
      "Three cartridges run in series and each can be inserted or ejected on its own. CHIP 4CH RESYNTH handles the pitch tracking and chip voice. ARP + GLIDE SEQUENCER locks to host tempo from 1/4 to 1/32 across one to four octaves with portamento up to 400 ms. CRUSH ROM DECIMATOR provides 1 to 16 bit reduction, rate divide of 1 to 64 with jitter, and a post filter from 18 kHz down to 540 Hz. With all three cartridges ejected, the plugin passes audio untouched and nulls against dry.",
      "The interface has no knobs. Parameters are driven from a D-pad and a four-shade dot-matrix display, six per cartridge.",
      "TALLBOY is $20 one-time with no subscription and no iLok, licensed for three machines. It is available as VST3, AU and AAX on macOS (universal, Pro Tools signed) and VST3 on Windows, 64-bit. A free demo is available with no email required.",
      `<a href="${URL}" style="color:#c2d24f;">${URL}</a>`,
      "Screenshots, audio examples and a review licence available on request.",
    ],
  },
  {
    key: "musicradar",
    to: ["contact@musicradar.com"],
    subject: "Chiptune resynthesiser that replays your vocal on a console sound chip - $20",
    preheader: "New release from a one-person plugin shop. Free demo, no email required.",
    variant: "personal",
    name: "MusicRadar team",
    paras: [
      "I run Carbonated Audio, a one-person plugin shop. I pitched you in August about two releases and did not hear back, so I will keep this one short and lead with the actual hook.",
      "TALLBOY takes a vocal, a bass line or a lead and replays it through a four-channel console sound chip. It tracks the pitch and envelope of the source and rebuilds the performance on modelled hardware channels, so the chip voice is genuinely following the take rather than sitting on top of it as an effect. A tempo-synced arpeggiator then spreads it across octaves and a decimator crushes it.",
      "The other thing worth a line: there are no knobs. Everything is driven from a D-pad and a four-shade dot-matrix screen.",
      "$20 one-time, no subscription, no iLok. VST3, AU and AAX on macOS, VST3 on Windows. Free demo, no email required.",
      `<a href="${URL}" style="color:#c2d24f;">${URL}</a> has audio examples of the same take before and after, on vocal, synth and drums.`,
      "Happy to send a review copy or any assets you need.",
    ],
  },
  {
    key: "rysup",
    to: ["support@rysupaudio.com"],
    subject: "TALLBOY - chiptune resynth and bitcrusher, $20",
    preheader: "New release, and a free plugin still on offer for your roundups.",
    variant: "personal",
    name: "Rys Up team",
    paras: [
      "I reached out in April about De-Sipper and again in August about Still. Third and last try, then I will leave you alone.",
      "New release: TALLBOY. It tracks the pitch of your audio and replays that performance through a four-channel console sound chip, then arpeggiates and decimates it. Three cartridges, each one insertable independently, driven from a D-pad and a dot-matrix screen instead of knobs. $20 one-time.",
      "Also still true from the August email: Still is a free one-dial noise suppressor and it is yours to feature in any free plugin roundup with no strings attached.",
      `<a href="${URL}" style="color:#c2d24f;">${URL}</a>`,
      "Licence key for either one any time you want it.",
    ],
  },
  {
    key: "danworrall",
    to: ["danwrecording@gmail.com"],
    subject: "A resynthesiser that rebuilds your take on a modelled sound chip - and it nulls",
    preheader: "Third pitch, no reply expected. The DSP detail is the point.",
    variant: "personal",
    name: "Dan",
    paras: [
      "Third time I have pitched you and I have never had a reply, which is completely fair. This is the last one, and I am leading with the technical detail because that is the part I think you would actually care about.",
      "TALLBOY is a pitch-tracking resynthesiser. It follows the pitch and envelope of the incoming signal and rebuilds it on four modelled console sound chip channels: two pulse channels with four duty cycles, a 32-sample 4-bit wavetable, and 15/7-bit LFSR noise keyed off transients, with detune done through an 11-bit frequency register rather than a smooth cents control. So the tuning quantises the way the hardware did.",
      "Two things I would expect you to test first, so I will save you the trouble. True bypass nulls perfectly against dry, and with all three cartridges ejected the plugin is transparent - it is a real passthrough, not a near-null. And the pitch tracker falls apart on anything polyphonic or unpitched, which I say plainly on the product page rather than pretending otherwise. On drums you eject the resynth and arp cartridges and run the decimator alone.",
      "One caveat before you spend any time on it: the free demo is macOS VST3 and AU only. If you want to look at it on Windows, reply and I will send you a full licence with no expectation of coverage. Same offer if you would rather just have the plugin and never mention it.",
      `<a href="${URL}" style="color:#c2d24f;">${URL}</a>`,
    ],
  },
];

// ---------------------------------------------------------------
function stripTags(h) {
  return h
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (m, href, txt) =>
      txt.trim() === href ? href : `${txt} (${href})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

const manifest = [];

for (const c of CONTACTS) {
  const bodyHtml = c.paras.map(p).join("\n");
  let html;
  if (c.variant === "spotlight") {
    html = buildEmail("spotlight", {
      product: "tallboy",
      name: c.name,
      headline: c.headline,
      body: bodyHtml,
      features: FEATURES,
      ctaText: "See TALLBOY - $20",
      ctaUrl: URL,
      preheader: c.preheader,
    });
  } else {
    html = buildEmail("personal", {
      name: c.name,
      body: bodyHtml,
      preheader: c.preheader,
    });
  }

  const plainParts = [];
  if (c.name) plainParts.push(`Hey ${c.name},`, "");
  if (c.headline) plainParts.push(c.headline, "");
  plainParts.push(...c.paras.map(stripTags).flatMap((t) => [t, ""]));
  if (c.variant === "spotlight") {
    plainParts.push("What is in it:", ...FEATURES.map((f) => `  - ${stripTags(f)}`), "");
    plainParts.push(SPECS, "");
    plainParts.push(`See TALLBOY - $20: ${URL}`, "");
  }
  plainParts.push("-- Soda", "Carbonated Audio", "carbonatedaudio.com");
  const plain = plainParts.join("\n");

  fs.writeFileSync(`/tmp/blast/out/${c.key}.html`, html);
  fs.writeFileSync(`/tmp/blast/out/${c.key}.txt`, plain);
  manifest.push({ key: c.key, to: c.to, cc: c.cc || [], subject: c.subject, htmlBytes: html.length });
}

fs.writeFileSync("/tmp/blast/out/manifest.json", JSON.stringify(manifest, null, 2));
console.log(`Built ${manifest.length} emails`);
for (const m of manifest) console.log(`  ${m.key.padEnd(16)} ${m.to.join(",")}${m.cc.length ? " cc:" + m.cc.join(",") : ""}`);
