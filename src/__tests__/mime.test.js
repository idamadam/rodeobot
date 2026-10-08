import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeEncodedWords,
  extractEmailAddress,
  parseRawEmail,
} from "../mime.js";

const encoder = new TextEncoder();

describe("MIME parsing", () => {
  it("decodes folded encoded-word subjects and quoted-printable HTML", () => {
    const email = parseRawEmail(
      [
        "From: Letterloop <hello@letterloop.co>",
        "Subject: =?UTF-8?B?8J+Riw==?= The Pig Pen:",
        " Issue No.2",
        "Content-Type: text/html; charset=utf-8",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        "<p>Caf=C3=A9 =E2=9C=A8 and a soft=",
        " break</p>",
      ].join("\r\n"),
    );

    assert.equal(email.from, "Letterloop <hello@letterloop.co>");
    assert.equal(email.subject, "👋 The Pig Pen: Issue No.2");
    assert.equal(email.html, "<p>Café ✨ and a soft break</p>");
    assert.equal(email.text, "");
  });

  it("finds HTML and text parts inside nested multiparts", () => {
    const html = Buffer.from("<b>Kia ora 🌿</b>").toString("base64");
    const raw = encoder.encode(
      [
        "From: hello@letterloop.co",
        "Subject: =?utf-8?Q?Caf=C3=A9_time?= =?utf-8?Q?_again?=",
        'Content-Type: multipart/mixed; boundary="outer"',
        "",
        "preamble",
        "--outer",
        "Content-Type: multipart/alternative; boundary=inner",
        "",
        "--inner",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Plain body",
        "--inner",
        "Content-Type: text/html; charset=utf-8",
        "Content-Transfer-Encoding: base64",
        "",
        html,
        "--inner--",
        "--outer--",
        "",
      ].join("\n"),
    );

    const email = parseRawEmail(raw);
    assert.equal(email.subject, "Café time again");
    assert.equal(email.text.trim(), "Plain body");
    assert.equal(email.html.trim(), "<b>Kia ora 🌿</b>");
  });

  it("reads unencoded UTF-8 headers and tolerates unknown charsets", () => {
    const email = parseRawEmail(
      encoder.encode(
        "Subject: Ünïcode\nContent-Type: text/plain; charset=x-unknown\n\nbody",
      ),
    );
    assert.equal(email.subject, "Ünïcode");
    assert.equal(email.text, "body");
  });

  it("handles messages without a body or headers", () => {
    assert.deepEqual(parseRawEmail("Subject: Only headers"), {
      from: "",
      subject: "Only headers",
      html: "",
      text: "",
    });
  });

  it("rejects invalid base64 bodies", () => {
    assert.throws(
      () =>
        parseRawEmail(
          "Content-Type: text/html\nContent-Transfer-Encoding: base64\n\n@@@=",
        ),
      /invalid base64/,
    );
    assert.equal(decodeEncodedWords("plain"), "plain");
  });

  it("extracts bare and display-name addresses", () => {
    assert.equal(extractEmailAddress("Letterloop <Hello@Letterloop.co>"), "hello@letterloop.co");
    assert.equal(extractEmailAddress("hello@letterloop.co"), "hello@letterloop.co");
    assert.equal(extractEmailAddress("nobody"), "");
  });
});
