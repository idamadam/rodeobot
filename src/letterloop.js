// Parses a Letterloop issue email into sections, prompts, and attributed
// entries. Letterloop's HTML has no semantic markup beyond `class="author"`,
// so this reads the leaf elements in document order and relies on the
// `#<memberId>-<sectionKey>` fragments on photo links for attribution.

export const LETTERLOOP_SENDER = "hello@letterloop.co";
const ISSUE_SUBJECT_PATTERN = /^\W*(.+?):\s*Issue No\.\s*(\d+)\s*$/u;
const MEMBER_FRAGMENT_PATTERN = /#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([^#]+)$/i;
const NEXT_ISSUE_LABEL = /next issue will be delivered on/i;
const PHOTO_WALL_KEY = "photowall";

const TOKEN_PATTERN = new RegExp(
  [
    String.raw`<a\b[^>]*?href="(?<cardHref>[^"]*-music)"[^>]*>(?<card>[\s\S]*?)</a>`,
    String.raw`<a\b[^>]*?href="(?<photoHref>[^"]*)"[^>]*>\s*<img\b[^>]*?src="(?<photoSrc>[^"]*)"`,
    String.raw`<a\b[^>]*?href="(?<issueHref>[^"]*)"[^>]*>\s*View full Issue on web\s*</a>`,
    String.raw`<span class="author"[^>]*>(?<author>[\s\S]*?)</span>\s*<span>(?<body>[\s\S]*?)</span>\s*</div>`,
    String.raw`<div\b[^>]*?style="(?<style>[^"]*)"[^>]*>(?<divText>[^<]*)</div>`,
  ].join("|"),
  "gi",
);

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const point =
        code[1].toLowerCase() === "x"
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

function cleanText(value) {
  return value
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToText(fragment) {
  const withLinks = fragment.replace(
    /<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, label) => {
      const url = decodeEntities(href);
      const text = decodeEntities(label.replace(/<[^>]+>/g, "")).trim();
      return !text || text === url ? url : `${text} (${url})`;
    },
  );
  const withBreaks = withLinks.replace(/<br\s*\/?>/gi, "\n");
  return cleanText(decodeEntities(withBreaks.replace(/<[^>]+>/g, "")));
}

function parseMemberFragment(href) {
  const match = MEMBER_FRAGMENT_PATTERN.exec(decodeEntities(href));
  return match ? { memberId: match[1].toLowerCase(), key: match[2] } : null;
}

// Letterloop links include the recipient's member ID, which acts as a personal
// access token. Only the issue and letterloop IDs are kept.
export function sanitizeIssueUrl(href) {
  let url;
  try {
    url = new URL(decodeEntities(href));
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== "app.letterloop.co") return null;
  const letterloopId = url.searchParams.get("letterloopId");
  url.search = "";
  url.hash = "";
  if (letterloopId) url.searchParams.set("letterloopId", letterloopId);
  return url.toString();
}

function parseMusicCard(href, card) {
  const member = parseMemberFragment(href);
  const texts = [...card.matchAll(/<div\b[^>]*>([^<]*)<\/div>/gi)]
    .map((match) => cleanText(decodeEntities(match[1])))
    .filter(Boolean);
  const artwork = /<img\b[^>]*?src="([^"]*)"/i.exec(card)?.[1];

  return {
    type: "track",
    memberId: member?.memberId ?? null,
    title: texts[0] ?? "Untitled",
    artist: texts[1] ?? "",
    artwork: artwork ? decodeEntities(artwork) : null,
  };
}

export function tokenizeIssueHtml(html) {
  const source = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|head|script)\b[\s\S]*?<\/\1>/gi, "");
  const tokens = [];

  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const groups = match.groups;

    if (groups.cardHref !== undefined) {
      tokens.push(parseMusicCard(groups.cardHref, groups.card));
    } else if (groups.photoHref !== undefined) {
      const member = parseMemberFragment(groups.photoHref);
      if (member) {
        tokens.push({
          type: "photo",
          memberId: member.memberId,
          key: member.key,
          url: decodeEntities(groups.photoSrc),
        });
      }
    } else if (groups.issueHref !== undefined) {
      tokens.push({ type: "issueLink", url: sanitizeIssueUrl(groups.issueHref) });
    } else if (groups.author !== undefined) {
      tokens.push({
        type: "answer",
        author: htmlToText(groups.author).replace(/:\s*$/, ""),
        text: htmlToText(groups.body),
      });
    } else {
      const text = cleanText(decodeEntities(groups.divText));
      if (!text) continue;
      const style = groups.style.replace(/\s+/g, "").toLowerCase();
      if (style.includes("font-style:italic")) {
        tokens.push({ type: "prompt", text });
      } else if (style.includes("font-size:18px") && style.includes("font-weight:bold")) {
        tokens.push({ type: "heading", text });
      } else {
        tokens.push({ type: "text", text });
      }
    }
  }

  return tokens;
}

function isMedia(item) {
  return item.type === "photo" || item.type === "track";
}

function attachMedia(entry, item) {
  if (item.type === "photo") entry.images.push(item.url);
  else entry.tracks.push({ title: item.title, artist: item.artist, artwork: item.artwork });
}

function createEntry(author, text, memberId = null) {
  return { author, text, memberId, images: [], tracks: [] };
}

// Most sections render "Name: text" followed by that person's media.
function resolveAuthorFirst(items, memberNames) {
  const entries = [];
  let current = null;

  for (const item of items) {
    if (item.type === "answer") {
      current = createEntry(item.author, item.text);
      entries.push(current);
    } else if (current && (current.memberId === null || current.memberId === item.memberId)) {
      current.memberId = item.memberId;
      memberNames.set(item.memberId, current.author);
      attachMedia(current, item);
    } else {
      current = createEntry(null, "", item.memberId);
      attachMedia(current, item);
      entries.push(current);
    }
  }

  return entries;
}

// The photo wall renders each person's photos first, then their caption.
function resolveCaptionAfter(items) {
  const entries = [];
  let pending = null;

  for (const item of items) {
    if (item.type === "answer") {
      const entry = createEntry(item.author, item.text, pending?.memberId ?? null);
      if (pending) {
        entry.images = pending.images;
        entry.tracks = pending.tracks;
      }
      entries.push(entry);
      pending = null;
      continue;
    }

    if (pending && pending.memberId !== item.memberId) {
      entries.push(pending);
      pending = null;
    }
    pending ??= createEntry(null, "", item.memberId);
    attachMedia(pending, item);
  }

  if (pending) entries.push(pending);
  return entries;
}

function hasContent(entry) {
  return Boolean(entry.text || entry.images.length || entry.tracks.length);
}

export function parseIssueSubject(subject) {
  const match = ISSUE_SUBJECT_PATTERN.exec(subject.trim());
  return match ? { newsletter: match[1].trim(), issueNumber: Number(match[2]) } : null;
}

export function parseLetterloopIssue(html) {
  const tokens = tokenizeIssueHtml(html);
  const issue = {
    title: null,
    issueLine: null,
    issueUrl: null,
    contributors: null,
    nextIssueDate: null,
    sections: [],
  };

  let section = null;
  let group = null;
  let awaitingNextIssueDate = false;

  for (const token of tokens) {
    if (awaitingNextIssueDate && token.type === "text") {
      issue.nextIssueDate = token.text;
      awaitingNextIssueDate = false;
      continue;
    }

    switch (token.type) {
      case "issueLink":
        issue.issueUrl ??= token.url;
        break;
      case "heading":
        section = { title: token.text, groups: [] };
        group = null;
        issue.sections.push(section);
        break;
      case "prompt":
        if (!section) break;
        group = { prompt: token.text, items: [] };
        section.groups.push(group);
        break;
      case "answer":
      case "photo":
      case "track":
        if (!section) break;
        if (!group) {
          group = { prompt: null, items: [] };
          section.groups.push(group);
        }
        group.items.push(token);
        break;
      case "text":
        if (!issue.title && !section) issue.title = token.text;
        else if (!issue.issueLine && /^Issue No\./i.test(token.text)) issue.issueLine = token.text;
        else if (/^\W*Made by\s/i.test(token.text)) {
          issue.contributors = token.text.replace(/^\W*Made by\s+/i, "");
          section = null;
          group = null;
        } else if (NEXT_ISSUE_LABEL.test(token.text)) awaitingNextIssueDate = true;
        break;
    }
  }

  // Author-first sections teach which member ID belongs to which name, which
  // labels any photo-wall uploads that were posted without a caption.
  const memberNames = new Map();
  const groups = issue.sections.flatMap((entry) => entry.groups);
  const isPhotoWall = (entry) =>
    entry.items.some((item) => item.type === "photo" && item.key === PHOTO_WALL_KEY);

  for (const entry of groups) entry.photoWall = isPhotoWall(entry);
  for (const entry of groups) {
    if (!entry.photoWall) entry.entries = resolveAuthorFirst(entry.items, memberNames);
  }
  for (const entry of groups) {
    if (entry.photoWall) entry.entries = resolveCaptionAfter(entry.items);
  }

  for (const current of issue.sections) {
    current.groups = current.groups
      .map(({ prompt, photoWall, entries }) => ({
        prompt,
        photoWall,
        entries: entries
          .map((entry) => ({
            ...entry,
            author: entry.author ?? memberNames.get(entry.memberId) ?? null,
          }))
          .filter(hasContent),
      }))
      .filter((entry) => entry.entries.length > 0);
  }
  issue.sections = issue.sections.filter((entry) => entry.groups.length > 0);

  if (!issue.title || issue.sections.length === 0) {
    throw new Error("Email did not match the expected Letterloop issue layout.");
  }

  return issue;
}
