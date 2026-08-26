# TALLBOY - itch.io listing (paste-ready)

Everything below is ready to paste. I could not create the listing myself:
itch.io was not logged in on this browser, and creating accounts and clearing
bot-verification challenges are both off limits for me. Once you are signed in,
this is about ten minutes of pasting.

Cover art is in this folder: tallboy-itch-cover-630x500.png (exact itch size,
cropped to the dot-matrix screen and cartridge slots rather than the whole unit,
because the full unit scales to 274px wide in itch's grid and reads as noise).

---

## Create the project

Dashboard -> Create new project

- **Title:** TALLBOY
- **Project URL:** tallboy
- **Short description / tagline:**
  Your track, played back on a handheld. Chiptune resynth, arp and bitcrusher in one cartridge slot.
- **Classification:** Tool
- **Kind of project:** Downloadable
- **Release status:** Released
- **Pricing:** Paid, $20 minimum (or "Free download / donate" if you would rather
  drive traffic to the site and sell there - see the note at the bottom)
- **Uploads:**
  - TALLBOY-Demo-Windows-Installer.exe, tagged Windows, marked "demo"
  - TALLBOY-Demo-Installer.pkg, tagged macOS, marked "demo"
  - For the paid version either upload the full installers and hand out keys
    through itch, or set the paid tier to deliver a link to carbonatedaudio.com
- **Community:** Comments on
- **Visibility:** Draft until you have looked at it, then Public

## Tags

vst, audio-plugin, music, chiptune, 8-bit, retro, tool, effects, sound-design, gamedev

## Description

TALLBOY tracks the pitch and envelope of whatever you feed it and replays that
performance through a four-channel console sound chip, then arpeggiates and
decimates it. It is not a filter sitting on top of your audio. It is an actual
chip voice following your line.

Three cartridges. Insert or eject each one independently.

**CHIP 4CH RESYNTH** - tracks pitch and envelope and rebuilds it on four modelled
channels: two pulse, a 4-bit wavetable, and LFSR noise.

**ARP + GLIDE SEQUENCER** - host-synced from 1/4 down to 1/32, five modes, one to
four octaves, portamento up to 400 ms.

**CRUSH ROM DECIMATOR** - 1 to 16 bits, rate divide 1 to 64 with jitter, post
filter from 18 kHz down to 540 Hz. Works on anything, cartridge or not.

Pull all three cartridges and it passes audio untouched.

There are no knobs. You drive it with a D-pad and a four-shade dot-matrix screen,
six parameters per cartridge.

### What you get

- $20 once. No subscription, no iLok, no dongle, no account.
- Three machines on one licence. Activate once online, works offline after that.
- macOS VST3, AU and AAX - universal for Apple Silicon and Intel, signed for Pro Tools.
- Windows VST3, 64-bit, with an installer.
- Lifetime updates.

### Demo

Free demo builds for macOS and Windows are attached to this page. Identical to
the paid version except audio plays for 60 seconds and then mutes for 10, on a
loop. No email required.

### About

Carbonated Audio is a one-person plugin company. Seven released plugins, all
one-time purchase, all serial-number licensed. Every other one we make is a mix
tool. This one changes what the source is.

https://carbonatedaudio.com/tallboy

---

## Note on pricing model

itch takes a revenue share you set yourself, default 10 percent. Two options:

1. **Sell on itch at $20.** Simplest for the buyer. You hand out keys from a
   batch - generate one with:
   `node scripts/generate-reseller-keys.js --product tallboy --reseller itch --count 25`
   (run it on its own line; it prompts for the license secret with echo off)
2. **Free demo on itch, paid link to your site.** You keep 100 percent and the
   buyer lands in your own funnel and email list. Loses the itch checkout
   convenience and itch ranks paid tools higher in its own browse pages.

For a $20 impulse-price tool with an audience that skews toward discovery
browsing, option 1 will almost certainly move more units. Your call.
