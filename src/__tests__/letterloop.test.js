import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  decodeEntities,
  parseIssueSubject,
  parseLetterloopIssue,
  sanitizeIssueUrl,
} from "../letterloop.js";

const ISSUE_HTML = readFileSync(
  new URL("./fixtures/letterloop-issue.html", import.meta.url),
  "utf8",
);

function summarize(entry) {
  return {
    author: entry.author,
    text: entry.text,
    images: entry.images.map((url) => /photo-(\d+)/.exec(url)?.[1]),
    tracks: entry.tracks.map((track) => `${track.title} / ${track.artist}`),
  };
}

describe("Letterloop issue parsing", () => {
  const issue = parseLetterloopIssue(ISSUE_HTML);

  it("reads the masthead, footer, and a member-free issue link", () => {
    assert.equal(issue.title, "The Test Loop");
    assert.equal(issue.issueLine, "Issue No.3 • November 13th, 2026");
    assert.equal(issue.contributors, "Sam, Jo and Ri");
    assert.equal(issue.nextIssueDate, "Friday, December 11th");
    assert.equal(
      issue.issueUrl,
      "https://app.letterloop.co/issue/issue123?letterloopId=loop456",
    );
    assert.deepEqual(
      issue.sections.map((section) => section.title),
      ["✨ Questions", "📸 Photo Wall", "🎧 Music", "👀 Check It Out", "🌤️ One Good Thing"],
    );
  });

  it("groups question answers under each prompt with following photos", () => {
    const [first, second] = issue.sections[0].groups;
    assert.equal(first.prompt, "What's the best thing you ate?");
    assert.deepEqual(first.entries.map(summarize), [
      { author: "Sam", text: "A very good pie & chips", images: [], tracks: [] },
      { author: "Jo", text: "Dumplings\n\nSo many dumplings", images: ["1"], tracks: [] },
      { author: "Ri", text: "Toast", images: [], tracks: [] },
    ]);
    assert.equal(second.prompt, "What are you reading?");
    assert.deepEqual(second.entries.map((entry) => entry.text), ["A novel", "Nothing"]);
  });

  it("attaches photo-wall uploads to the caption that follows them", () => {
    const [group] = issue.sections[1].groups;
    assert.equal(group.photoWall, true);
    assert.deepEqual(group.entries.map(summarize), [
      { author: "Sam", text: "Beach day", images: ["2"], tracks: [] },
      { author: "Jo", text: "Two cats", images: ["3", "4"], tracks: [] },
      // Ri posted no caption; the name comes from Ri's media elsewhere.
      { author: "Ri", text: "", images: ["5"], tracks: [] },
    ]);
  });

  it("reads music cards, links, and drops empty answers", () => {
    assert.deepEqual(issue.sections[2].groups[0].entries.map(summarize), [
      { author: "Sam", text: "", images: [], tracks: ["Song & Dance / The Band"] },
      {
        author: "Ri",
        text: "",
        images: [],
        tracks: ["First / Artist A", "Second [Live] / Artist B"],
      },
    ]);
    assert.equal(
      issue.sections[2].groups[0].entries[0].tracks[0].artwork,
      "https://i.scdn.co/image/art-Son",
    );
    assert.deepEqual(issue.sections[3].groups[0].entries.map(summarize), [
      { author: "Jo", text: "This site: https://example.com/thing", images: [], tracks: [] },
      { author: "Ri", text: "", images: ["6"], tracks: [] },
    ]);
    assert.deepEqual(
      issue.sections[4].groups[0].entries.map((entry) => entry.author),
      ["Sam"],
    );
  });

  it("never exposes the recipient's member token", () => {
    assert.doesNotMatch(JSON.stringify(issue), /member=|9999-4999/);
  });

  it("labels uncaptioned photos from unknown members as anonymous", () => {
    const html = `
      <div style="font-size:34px">Loop</div>
      <div style="font-size:18px;font-weight:bold">📸 Photo Wall</div>
      <a href="https://app.letterloop.co/issue/x#44444444-4444-4444-8444-444444444444-photowall"><img src="https://img/1"></a>
      <a href="https://app.letterloop.co/issue/x#55555555-5555-4555-8555-555555555555-photowall"><img src="https://img/2"></a>`;
    const entries = parseLetterloopIssue(html).sections[0].groups[0].entries;
    assert.deepEqual(entries.map((entry) => [entry.author, entry.images]), [
      [null, ["https://img/1"]],
      [null, ["https://img/2"]],
    ]);
  });

  it("starts a new entry when media belongs to someone else", () => {
    const html = `
      <div style="font-size:34px">Loop</div>
      <div style="font-size:18px;font-weight:bold">👀 Check It Out</div>
      <a href="https://app.letterloop.co/issue/x#44444444-4444-4444-8444-444444444444-checkitout"><img src="https://img/1"></a>
      <div><span class="author">Al:</span><span> Look</span></div>
      <a href="https://app.letterloop.co/issue/x#44444444-4444-4444-8444-444444444444-checkitout"><img src="https://img/2"></a>
      <a href="https://app.letterloop.co/issue/x#55555555-5555-4555-8555-555555555555-checkitout"><img src="https://img/3"></a>`;
    const entries = parseLetterloopIssue(html).sections[0].groups[0].entries;
    assert.deepEqual(entries.map((entry) => [entry.author, entry.images]), [
      ["Al", ["https://img/1"]],
      ["Al", ["https://img/2"]],
      [null, ["https://img/3"]],
    ]);
  });

  it("rejects emails that do not look like an issue", () => {
    assert.throws(() => parseLetterloopIssue("<p>Hello</p>"), /expected Letterloop issue layout/);
  });

  it("parses issue subjects", () => {
    assert.deepEqual(parseIssueSubject("👋 The Pig Pen: Issue No.12"), {
      newsletter: "The Pig Pen",
      issueNumber: 12,
    });
    assert.equal(parseIssueSubject("💬 New comment on The Pig Pen"), null);
    assert.equal(parseIssueSubject("📮 In The Loop: Issue No.72").newsletter, "In The Loop");
  });

  it("sanitizes only Letterloop HTTPS links", () => {
    assert.equal(sanitizeIssueUrl("not a url"), null);
    assert.equal(sanitizeIssueUrl("https://evil.example/issue/1"), null);
    assert.equal(
      sanitizeIssueUrl("https://app.letterloop.co/issue/1?member=secret#frag"),
      "https://app.letterloop.co/issue/1",
    );
  });

  it("decodes numeric and named entities", () => {
    assert.equal(decodeEntities("&#x3D;&#61;&amp;&nbsp;&unknown;"), "==& &unknown;");
  });
});
