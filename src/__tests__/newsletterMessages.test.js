import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parseLetterloopIssue } from "../letterloop.js";
import {
  COMPONENTS_V2_FLAG,
  DISCORD_COMPONENT_LIMIT,
  DISCORD_COMPONENT_TEXT_LIMIT,
  buildIssueThreadName,
  buildNewsletterMessages,
} from "../newsletterMessages.js";

const ISSUE_HTML = readFileSync(
  new URL("./fixtures/letterloop-issue.html", import.meta.url),
  "utf8",
);

function entry(author, text, { images = [], tracks = [] } = {}) {
  return { author, text, memberId: null, images, tracks };
}

const text = (content) => ({ type: 10, content });
const gallery = (...urls) => ({ type: 12, items: urls.map((url) => ({ media: { url } })) });

function componentCount(components) {
  return components.reduce(
    (total, component) =>
      total + 1 + (component.components?.length ?? 0) + (component.accessory ? 1 : 0),
    0,
  );
}

function textLength(components) {
  return components.reduce(
    (total, component) =>
      total + (component.content?.length ?? 0) + textLength(component.components ?? []),
    0,
  );
}

function issueWith(groups, title = "📸 Photo Wall") {
  return {
    title: "Loop",
    issueLine: "Issue No.1 • January 1st, 2027",
    issueUrl: null,
    contributors: null,
    nextIssueDate: null,
    sections: [{ title, groups }],
  };
}

describe("newsletter Discord messages", () => {
  const messages = buildNewsletterMessages(parseLetterloopIssue(ISSUE_HTML), {
    issueNumber: 3,
  });

  it("opens a forum post with the banner and issue summary", () => {
    assert.deepEqual(messages[0], {
      username: "The Test Loop",
      allowed_mentions: { parse: [] },
      thread_name: "Issue No.3 · November 13th, 2026",
      flags: COMPONENTS_V2_FLAG,
      components: [
        gallery("https://ik.imagekit.io/letterloop/logo.png"),
        text(
          [
            "📬 **The Test Loop** — Issue No.3 • November 13th, 2026",
            "🖋 Made by Sam, Jo and Ri",
            "🔗 [Read it on Letterloop](<https://app.letterloop.co/issue/issue123?letterloopId=loop456>)",
            "🗓️ Next issue: Friday, December 11th",
            "-# Each section is posted below — reply to whatever catches your eye.",
          ].join("\n"),
        ),
      ],
    });
    assert.ok(messages.slice(1).every((message) => !("thread_name" in message)));
  });

  it("places each person's photos in a gallery under their answer", () => {
    assert.deepEqual(messages[1], {
      username: "The Test Loop",
      allowed_mentions: { parse: [] },
      flags: COMPONENTS_V2_FLAG,
      components: [
        text(
          [
            "-# ✨ Questions",
            "## What's the best thing you ate?",
            "**Sam:** A very good pie & chips",
            "**Jo:** Dumplings\n\nSo many dumplings",
          ].join("\n"),
        ),
        gallery("https://ik.imagekit.io/letterloop/tr:w-2400/v0/b/x/o/photo-1.jpg?alt=media&token=t1"),
        text("**Ri:** Toast"),
      ],
    });
    assert.deepEqual(messages[2].components, [
      text("-# ✨ Questions\n## What are you reading?\n**Sam:** A novel\n**Ri:** Nothing"),
    ]);
  });

  it("gives each photo-wall post its own message", () => {
    assert.deepEqual(
      messages.slice(3, 6).map(({ components }) => [
        components[0].content,
        components[1].items.length,
      ]),
      [
        ["## 📸 Photo Wall\n**Sam:** Beach day", 1],
        ["**Jo:** Two cats", 2],
        ["**Ri:**", 1],
      ],
    );
  });

  const musicLinks = (query) =>
    "-# " +
    [
      `[Spotify](<https://open.spotify.com/search/${query}>)`,
      `[Apple Music](<https://music.apple.com/search?term=${query}>)`,
      `[YouTube Music](<https://music.youtube.com/search?q=${query}>)`,
    ].join(" · ");

  it("shows tracks with album art and links to each music service", () => {
    const track = (content, artwork) => ({
      type: 9,
      components: [text(content)],
      accessory: { type: 11, media: { url: artwork } },
    });
    assert.deepEqual(messages[6].components, [
      text("## 🎧 Music\n**Sam:**"),
      track(
        `🎵 **Song & Dance — The Band**\n${musicLinks("Song%20%26%20Dance%20The%20Band")}`,
        "https://i.scdn.co/image/art-Son",
      ),
      text("**Ri:**"),
      track(
        `🎵 **First — Artist A**\n${musicLinks("First%20Artist%20A")}`,
        "https://i.scdn.co/image/art-Fir",
      ),
      track(
        `🎵 **Second \\[Live\\] — Artist B**\n${musicLinks("Second%20%5BLive%5D%20Artist%20B")}`,
        "https://i.scdn.co/image/art-Sec",
      ),
    ]);

    const plain = buildNewsletterMessages(
      issueWith(
        [{ prompt: null, entries: [entry("A", "", { tracks: [{ title: "Song_Remix", artist: "" }] })] }],
        "🎧 Music",
      ),
    );
    assert.deepEqual(plain[1].components, [
      text(`## 🎧 Music\n**A:**\n🎵 **Song\\_Remix**\n${musicLinks("Song_Remix")}`),
    ]);
  });

  it("disables every mention parse", () => {
    assert.equal(messages.length, 9);
    assert.match(messages.at(-1).components[0].content, /@everyone/);
    assert.ok(messages.every((message) => message.allowed_mentions.parse.length === 0));
  });

  it("splits groups that exceed Discord's component and text limits", () => {
    const images = Array.from({ length: 12 }, (_, index) => `https://img/${index}`);
    const long = "word ".repeat(700).trim();
    const tracks = Array.from({ length: 14 }, (_, index) => ({
      title: `T${index}`,
      artist: "A",
      artwork: `https://art/${index}`,
    }));
    const split = buildNewsletterMessages(
      issueWith(
        [
          {
            prompt: null,
            entries: [
              entry("A", long),
              entry("B", long),
              entry("C", "", { images }),
              entry("D", "", { tracks }),
            ],
          },
        ],
        "👀 Check It Out",
      ),
    ).slice(1);

    for (const message of split) {
      assert.ok(componentCount(message.components) <= DISCORD_COMPONENT_LIMIT);
      assert.ok(textLength(message.components) <= DISCORD_COMPONENT_TEXT_LIMIT);
    }
    const all = split.flatMap((message) => message.components);
    assert.deepEqual(
      all.filter((component) => component.type === 12).map((g) => g.items.length),
      [10, 2],
    );
    assert.equal(all.filter((component) => component.type === 9).length, 14);
    assert.match(split[0].components[0].content, /^## 👀 Check It Out\n\*\*A:\*\*/);
    assert.match(split[1].components[0].content, /^\*\*B:\*\*/);
  });

  it("hard-splits a single answer longer than one message", () => {
    const words = `${"x".repeat(3_000)} ${"y".repeat(3_000)}`;
    const unbroken = "z".repeat(8_100);
    const split = buildNewsletterMessages(
      issueWith(
        [{ prompt: null, entries: [entry("Name", words), entry(null, unbroken)] }],
        "🌤️ One Good Thing",
      ),
    ).slice(1);

    assert.ok(split.length >= 5);
    assert.ok(split.every((message) => textLength(message.components) <= DISCORD_COMPONENT_TEXT_LIMIT));
    const joined = split.map((message) => message.components[0].content).join("");
    assert.match(joined, /\*\*Someone:\*\*/);
    assert.match(joined, /z$/);
  });

  it("names threads from the subject when the issue line is missing", () => {
    assert.equal(buildIssueThreadName({ issueLine: null }, { issueNumber: 7 }), "Issue No.7");
    assert.equal(buildIssueThreadName({ issueLine: null }), "Issue No.?");
    assert.equal(buildIssueThreadName({ issueLine: "x".repeat(150) }).length, 100);

    const minimal = buildNewsletterMessages({ ...issueWith([]), issueLine: null });
    assert.deepEqual(minimal[0].components.map((component) => component.type), [10]);
    assert.equal(minimal[0].components[0].content.split("\n")[0], "📬 **Loop** — New issue");
  });
});
