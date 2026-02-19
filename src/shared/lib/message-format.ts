export type Segment =
  | { type: "text"; content: string }
  | { type: "link"; content: string; href: string }
  | { type: "mention"; content: string; userId: string };

const URL_RE = /https?:\/\/[^\s<>]+|www\.[^\s<>]+/g;
const MENTION_RE = /@([a-fA-F0-9]{34,68}):([^\s]+)/g;

/**
 * Strip hex addresses from mentions for plain-text preview.
 * "@50486457...5:Daniel_Satchkov" → "@Daniel_Satchkov"
 */
export function stripMentionAddresses(text: string): string {
  if (!text) return "";
  return text.replace(MENTION_RE, (_match, _hex, name) => `@${name}`);
}

/**
 * Parse a message string into renderable segments: plain text, links, and mentions.
 * Segments are returned in the order they appear in the input.
 */
export function parseMessage(text: string): Segment[] {
  if (!text) return [{ type: "text", content: "" }];

  // Collect all matches with their positions
  const matches: { start: number; end: number; segment: Segment }[] = [];

  // Links
  for (const m of text.matchAll(URL_RE)) {
    const href = m[0].startsWith("www.") ? `https://${m[0]}` : m[0];
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      segment: { type: "link", content: m[0], href },
    });
  }

  // Mentions: @hexaddr:displayName
  for (const m of text.matchAll(MENTION_RE)) {
    // Skip if this range overlaps with a link
    const start = m.index!;
    const end = start + m[0].length;
    const overlaps = matches.some(
      (existing) => start < existing.end && end > existing.start,
    );
    if (overlaps) continue;

    matches.push({
      start,
      end,
      segment: { type: "mention", content: `@${m[2]}`, userId: m[1] },
    });
  }

  if (matches.length === 0) {
    return [{ type: "text", content: text }];
  }

  // Sort by start position
  matches.sort((a, b) => a.start - b.start);

  // Build segments from gaps and matches
  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({ type: "text", content: text.slice(cursor, match.start) });
    }
    segments.push(match.segment);
    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", content: text.slice(cursor) });
  }

  return segments;
}
