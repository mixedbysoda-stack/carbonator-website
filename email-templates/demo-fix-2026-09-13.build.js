const { buildEmail, BRAND } = require("./render");
const fs = require("fs");

const L = {
  desipper: "https://github.com/mixedbysoda-stack/desipper/releases/download/v1.0.0-demo/DeSipper-Demo-v1.0.0-macOS.pkg",
  ontap: "https://github.com/mixedbysoda-stack/ontap/releases/download/v1.0.0-demo/OnTap-Demo-macOS.pkg",
  pour: "https://github.com/mixedbysoda-stack/pour/releases/download/v1.0.0-demo/Pour-v1.0.0-Demo-Installer.pkg",
};
const p = (t) => `<p style="color:${BRAND.textSecondary};font-size:15px;line-height:1.7;margin:0 0 16px;">${t}</p>`;
const link = (href, text, color) => `<a href="${href}" style="color:${color};text-decoration:none;font-weight:600;">${text}</a>`;

const body = [
  p("If you grabbed one of our macOS demos this year and it did nothing, that was our build, not your setup. I found it this weekend and it is fixed."),
  p("The macOS demo installers for De-Sipper, On Tap and Pour were compiled with the wrong minimum system version. They reported \"requires macOS 26\" and would not load or pass plugin validation on anything older. The De-Sipper demo was worse: it had no Intel build in it at all. The paid versions were always built correctly, which is how this went five months without anyone catching it."),
  p("All three are rebuilt, re-signed and notarized, macOS 10.13 and later, Intel and Apple Silicon native:"),
  `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
    <tr><td style="padding:7px 0;color:${BRAND.textSecondary};font-size:15px;">${link(L.desipper, "De-Sipper demo", "#6fc7bc")} <span style="color:${BRAND.textMuted};">- dynamic de-esser</span></td></tr>
    <tr><td style="padding:7px 0;color:${BRAND.textSecondary};font-size:15px;">${link(L.ontap, "On Tap demo", "#a855f7")} <span style="color:${BRAND.textMuted};">- tempo-synced sidechain ducking</span></td></tr>
    <tr><td style="padding:7px 0;color:${BRAND.textSecondary};font-size:15px;">${link(L.pour, "Pour demo", "#6fc7bc")} <span style="color:${BRAND.textMuted};">- stereo imaging with a live vectorscope</span></td></tr>
  </table>`,
  p("The links are the same ones as before, so a bookmarked download now serves the fixed build. The demos play 60 seconds of audio and then mute for 10, on a loop. That is the trial limit, not a bug."),
  p("One install note: the version number did not change, so if your DAW or macOS cached the failed validation, restart the machine before you rescan, or run <span style=\"font-family:" + BRAND.mono + ";font-size:13px;color:#ffffff;\">killall -9 AudioComponentRegistrar</span> in Terminal first."),
  p("Sorry for the wasted download. If anything still misbehaves, hit reply and send me the exact error, and I will dig into it."),
  p("<span style=\"color:" + BRAND.textMuted + ";font-size:13px;\">PS - the Mega Bundle (every plugin, plus every expansion pack as it drops) is $350 through October 12 if you end up liking what you hear. No code needed, the price is live on the site.</span>"),
].join("\n");

let html = buildEmail("personal", {
  body,
  signatureName: "Miguel",
  preheader: "The macOS demo builds required macOS 26 by mistake. Rebuilt for 10.13 and later, Intel and Apple Silicon.",
});

const before = html;
html = html.replace('href="mailto:hello@carbonatedaudio.com?subject=Unsubscribe"', 'href="{{{RESEND_UNSUBSCRIBE_URL}}}"');
if (html === before) { console.error("FAILED to swap the unsubscribe link"); process.exit(1); }

fs.writeFileSync("out/demo-fix-2026-09-13.html", html);

const text = `If you grabbed one of our macOS demos this year and it did nothing, that was our build, not your setup. I found it this weekend and it is fixed.

The macOS demo installers for De-Sipper, On Tap and Pour were compiled with the wrong minimum system version. They reported "requires macOS 26" and would not load or pass plugin validation on anything older. The De-Sipper demo was worse: it had no Intel build in it at all. The paid versions were always built correctly, which is how this went five months without anyone catching it.

All three are rebuilt, re-signed and notarized, macOS 10.13 and later, Intel and Apple Silicon native:

De-Sipper demo (dynamic de-esser): ${L.desipper}
On Tap demo (tempo-synced sidechain ducking): ${L.ontap}
Pour demo (stereo imaging with a live vectorscope): ${L.pour}

The links are the same ones as before, so a bookmarked download now serves the fixed build. The demos play 60 seconds of audio and then mute for 10, on a loop. That is the trial limit, not a bug.

One install note: the version number did not change, so if your DAW or macOS cached the failed validation, restart the machine before you rescan, or run "killall -9 AudioComponentRegistrar" in Terminal first.

Sorry for the wasted download. If anything still misbehaves, hit reply and send me the exact error, and I will dig into it.

Miguel
Carbonated Audio

PS - the Mega Bundle (every plugin, plus every expansion pack as it drops) is $350 through October 12 if you end up liking what you hear. No code needed, the price is live on the site.

Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`;
fs.writeFileSync("out/demo-fix-2026-09-13.txt", text);
console.log("html", html.length, "bytes; text", text.length, "bytes");
console.log("links:", (html.match(/https:\/\/github.com[^"]+/g)||[]).length, "github,", /RESEND_UNSUBSCRIBE_URL/.test(html) ? "unsub ok" : "UNSUB MISSING");
