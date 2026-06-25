// Minimal, defensive RSS 2.0 + Atom parser. No dependency — these feeds are
// simple and we'd rather control the failure modes. Anything malformed yields
// fewer items, never a throw.

export type RawFeedItem = {
  title: string;
  link: string;
  publishedAt: string | null; // ISO
  summary: string | null;
};

/** Pull the first <tag>…</tag> inner text from a block (CDATA-aware). */
function tag(block: string, name: string): string | null {
  const m = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"),
  );
  return m ? stripCdata(m[1]).trim() : null;
}

function stripCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  "#x27": "'",
  nbsp: " ",
  "#160": " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&([a-z]+|#\d+|#x[0-9a-f]+);/gi, (full, code: string) => {
      const key = code.toLowerCase();
      if (key in ENTITIES) return ENTITIES[key];
      if (key.startsWith("#x")) {
        const n = parseInt(key.slice(2), 16);
        return Number.isFinite(n) ? String.fromCodePoint(n) : full;
      }
      if (key.startsWith("#")) {
        const n = parseInt(key.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : full;
      }
      return full;
    })
    .trim();
}

/** Strip HTML tags and collapse whitespace for a plain-text summary. */
function toPlainText(html: string | null, max = 280): string | null {
  if (!html) return null;
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

function toIso(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw); // handles RFC822 (pubDate) and ISO8601 (Atom)
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** RSS <link>text</link>; Atom <link href="…" rel="alternate"/>. */
function extractLink(block: string): string | null {
  const rss = tag(block, "link");
  if (rss && /^https?:\/\//i.test(rss)) return rss;
  const atom = block.match(
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i,
  );
  return atom ? atom[1] : (rss ?? null);
}

export function parseFeed(xml: string): RawFeedItem[] {
  if (!xml || typeof xml !== "string") return [];
  // RSS <item> or Atom <entry>
  const blocks =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ??
    [];

  const items: RawFeedItem[] = [];
  for (const block of blocks) {
    const title = decodeEntities(tag(block, "title") ?? "");
    const link = extractLink(block);
    if (!title || !link) continue; // skip unusable entries
    const published =
      tag(block, "pubDate") ??
      tag(block, "published") ??
      tag(block, "updated") ??
      tag(block, "dc:date");
    const summary =
      tag(block, "description") ??
      tag(block, "summary") ??
      tag(block, "content:encoded");
    items.push({
      title,
      link,
      publishedAt: toIso(published),
      summary: toPlainText(summary),
    });
  }
  return items;
}
