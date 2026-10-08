import { DISCORD_MESSAGE_LIMIT } from "./webhook.js";

// Section messages use Discord's Components V2 layout so each person's photos
// render as a native gallery directly beneath their answer.
export const COMPONENTS_V2_FLAG = 1 << 15;
export const DISCORD_COMPONENT_LIMIT = 40;
export const DISCORD_COMPONENT_TEXT_LIMIT = 4_000;
export const DISCORD_GALLERY_LIMIT = 10;
export const DISCORD_THREAD_NAME_LIMIT = 100;

const TEXT_DISPLAY = 10;
const SECTION = 9;
const THUMBNAIL = 11;
const MEDIA_GALLERY = 12;

function truncate(value, limit) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}

function escapeMarkdown(value) {
  return value.replace(/[*_~`|[\]\\]/g, "\\$&");
}

// Letterloop only provides the title and artist, so each service gets a search.
const MUSIC_SEARCHES = [
  ["Spotify", (query) => `https://open.spotify.com/search/${encodeURIComponent(query)}`],
  ["Apple Music", (query) => `https://music.apple.com/search?term=${encodeURIComponent(query)}`],
  ["YouTube Music", (query) => `https://music.youtube.com/search?q=${encodeURIComponent(query)}`],
];

function formatTrack(track) {
  const label = [track.title, track.artist].filter(Boolean).join(" — ");
  const query = [track.title, track.artist].filter(Boolean).join(" ");
  // Angle brackets stop Discord unfurling a preview for every link.
  const links = MUSIC_SEARCHES.map(([name, url]) => `[${name}](<${url(query)}>)`);
  return `🎵 **${escapeMarkdown(label)}**\n-# ${links.join(" · ")}`;
}

// Splits text that cannot fit in one message, preferring line then word breaks.
function splitText(value, limit) {
  const chunks = [];
  let remaining = value;

  while (remaining.length > limit) {
    const window = remaining.slice(0, limit);
    let cut = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
    if (cut < limit / 2) cut = limit;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function textAtoms(text) {
  return splitText(text, DISCORD_COMPONENT_TEXT_LIMIT).map((content) => ({
    component: { type: TEXT_DISPLAY, content },
    chars: content.length,
    count: 1,
  }));
}

function trackAtom(track) {
  const content = formatTrack(track);
  if (!track.artwork) return textAtoms(content)[0];
  return {
    component: {
      type: SECTION,
      components: [{ type: TEXT_DISPLAY, content }],
      accessory: { type: THUMBNAIL, media: { url: track.artwork } },
    },
    chars: content.length,
    count: 3,
  };
}

function galleryAtoms(images) {
  const atoms = [];
  for (let index = 0; index < images.length; index += DISCORD_GALLERY_LIMIT) {
    atoms.push({
      component: {
        type: MEDIA_GALLERY,
        items: images
          .slice(index, index + DISCORD_GALLERY_LIMIT)
          .map((url) => ({ media: { url } })),
      },
      chars: 0,
      count: 1,
    });
  }
  return atoms;
}

function entryAtoms(entry, heading = "") {
  const name = entry.author ?? "Someone";
  const line = entry.text ? `**${name}:** ${entry.text}` : `**${name}:**`;
  return [
    ...textAtoms(heading ? `${heading}\n${line}` : line),
    ...entry.tracks.map(trackAtom),
    ...galleryAtoms(entry.images),
  ];
}

function groupHeading(section, group, isFirstGroup) {
  if (group.prompt) return `-# ${section.title}\n## ${group.prompt}`;
  return isFirstGroup ? `## ${section.title}` : "";
}

// Packs a group into as few messages as Discord's component and text limits
// allow. Adjacent text is merged into one block, and an entry moves to a new
// message rather than being split whenever it would fit there whole.
function packGroup(heading, entries) {
  const messages = [];
  let components = [];
  let count = 0;
  let chars = 0;
  let hasEntries = false;

  const mergesWithLast = (atom) =>
    atom.component.type === TEXT_DISPLAY && components.at(-1)?.type === TEXT_DISPLAY;
  const cost = (atom) => ({
    count: mergesWithLast(atom) ? 0 : atom.count,
    chars: atom.chars + (mergesWithLast(atom) ? 1 : 0),
  });
  const fits = (atom) => {
    const next = cost(atom);
    return (
      count + next.count <= DISCORD_COMPONENT_LIMIT &&
      chars + next.chars <= DISCORD_COMPONENT_TEXT_LIMIT
    );
  };
  const flush = () => {
    if (components.length) messages.push(components);
    components = [];
    count = 0;
    chars = 0;
    hasEntries = false;
  };
  const add = (atom) => {
    if (!fits(atom)) flush();
    const next = cost(atom);
    if (mergesWithLast(atom)) {
      const last = components.at(-1);
      components[components.length - 1] = {
        ...last,
        content: `${last.content}\n${atom.component.content}`,
      };
    } else {
      components.push(atom.component);
    }
    count += next.count;
    chars += next.chars;
  };

  // The heading joins the first entry's text so a long answer cannot strand it.
  if (heading && entries.length === 0) textAtoms(heading).forEach(add);

  for (const [index, entry] of entries.entries()) {
    const atoms = entryAtoms(entry, index === 0 ? heading : "");
    const entryCount = atoms.reduce((total, atom) => total + atom.count, 0);
    const entryChars = atoms.reduce((total, atom) => total + atom.chars + 1, 0);
    const entryFits =
      count + entryCount <= DISCORD_COMPONENT_LIMIT &&
      chars + entryChars <= DISCORD_COMPONENT_TEXT_LIMIT;
    if (hasEntries && !entryFits) flush();

    atoms.forEach(add);
    hasEntries = true;
  }

  flush();
  return messages;
}

export function buildIssueThreadName(issue, subjectInfo) {
  const label = issue.issueLine ?? `Issue No.${subjectInfo?.issueNumber ?? "?"}`;
  return truncate(label.replace(/\s*•\s*/g, " · "), DISCORD_THREAD_NAME_LIMIT);
}

function buildIntro(issue) {
  const lines = [`📬 **${issue.title}** — ${issue.issueLine ?? "New issue"}`];
  if (issue.contributors) lines.push(`🖋 Made by ${issue.contributors}`);
  if (issue.issueUrl) lines.push(`🔗 [Read it on Letterloop](<${issue.issueUrl}>)`);
  if (issue.nextIssueDate) lines.push(`🗓️ Next issue: ${issue.nextIssueDate}`);
  lines.push("-# Each section is posted below — reply to whatever catches your eye.");
  return truncate(lines.join("\n"), DISCORD_MESSAGE_LIMIT);
}

export function buildNewsletterMessages(issue, subjectInfo) {
  const base = {
    username: truncate(issue.title, 80),
    allowed_mentions: { parse: [] },
  };
  // The opening post mirrors the email masthead: the group's banner, then
  // the issue summary.
  const messages = [
    {
      ...base,
      thread_name: buildIssueThreadName(issue, subjectInfo),
      flags: COMPONENTS_V2_FLAG,
      components: [
        ...(issue.bannerUrl ? galleryAtoms([issue.bannerUrl]).map((atom) => atom.component) : []),
        { type: TEXT_DISPLAY, content: buildIntro(issue) },
      ],
    },
  ];

  for (const section of issue.sections) {
    section.groups.forEach((group, index) => {
      const heading = groupHeading(section, group, index === 0);
      // Photo-wall posts get a message each so replies can target them.
      const packed = group.photoWall
        ? group.entries.flatMap((entry, entryIndex) =>
            packGroup(entryIndex === 0 ? heading : "", [entry]),
          )
        : packGroup(heading, group.entries);
      for (const components of packed) {
        messages.push({ ...base, flags: COMPONENTS_V2_FLAG, components });
      }
    });
  }

  return messages;
}
