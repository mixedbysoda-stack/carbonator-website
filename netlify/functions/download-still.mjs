import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

// The `latest` alias is resolved by GitHub at request time, so tagging a new
// release ships it to everyone with no code change and no upload step. This is
// the single source of truth for the installer — nothing is mirrored, so no
// mirror can go stale or be wiped by a manual deploy.
const INSTALLER_URL =
  "https://github.com/mixedbysoda-stack/still/releases/latest/download/Still-Installer.pkg";
const DOWNLOAD_FILENAME = "Still-Installer.pkg";

function message(status, text) {
  return new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// A grant is what a confirmed email address buys: a short-lived, unguessable
// right to pull the installer through our own domain.
export async function readGrant(token) {
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const store = getStore({ name: "still-downloads" });
  const grant = await store.get(`dl_${hash}`, { type: "json" }).catch(() => null);
  if (!grant) return null;
  if (Date.now() > new Date(grant.expires_at).getTime()) return { expired: true };
  return { ...grant, hash, store };
}

export default async (request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return message(400, "Missing download link.");

  const grant = await readGrant(token);
  if (!grant) return message(403, "That download link is not valid. Request Still again for a new one.");
  if (grant.expired) return message(410, "That download link has expired. Request Still again for a new one.");

  // Record the pull for funnel reporting. A counter failure must never stand
  // between a real person and the plugin they were promised.
  grant.store
    .setJSON(`dl_${grant.hash}`, {
      ...grant,
      hash: undefined,
      store: undefined,
      downloads: Number(grant.downloads || 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .catch(() => {});

  // Preferred path: pipe the installer through our own domain so the visitor
  // never sees a third-party host. If the upstream is slow or unreachable we
  // hand them a redirect instead — a visible GitHub URL beats a failed
  // download, and this is the only case where they will ever see one.
  try {
    const upstream = await fetch(INSTALLER_URL, { redirect: "follow" });
    if (!upstream.ok || !upstream.body) throw new Error(`upstream ${upstream.status}`);

    const headers = {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${DOWNLOAD_FILENAME}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    const length = upstream.headers.get("content-length");
    if (length) headers["Content-Length"] = length;

    return new Response(upstream.body, { headers });
  } catch (err) {
    console.error("Still installer proxy failed, falling back to redirect:", err.message);
    return new Response("", {
      status: 302,
      headers: { Location: INSTALLER_URL, "Cache-Control": "no-store" },
    });
  }
};
