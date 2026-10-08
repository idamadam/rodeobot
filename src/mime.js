// Minimal MIME reader for inbound Email Worker messages. It handles the parts
// Letterloop and Gmail forwarding produce: folded headers, RFC 2047 encoded
// words, nested multiparts, and base64 or quoted-printable bodies.

// Maps each byte to one code unit. TextDecoder("latin1") is windows-1252,
// which rewrites 0x80-0x9F and would corrupt 8-bit UTF-8 content.
function toBinaryString(raw) {
  if (typeof raw === "string") return raw;
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  let value = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    value += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return value;
}

function binaryToBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function decodeBytes(bytes, charset = "utf-8") {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function decodeQuotedPrintable(value, { underscoreIsSpace = false } = {}) {
  let text = value.replace(/=\r?\n/g, "");
  if (underscoreIsSpace) text = text.replace(/_/g, " ");
  return text.replace(/=([0-9A-F]{2})/gi, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function decodeBase64(value) {
  try {
    return atob(value.replace(/[^A-Za-z0-9+/=]/g, ""));
  } catch {
    throw new Error("Email contains an invalid base64 body.");
  }
}

export function decodeEncodedWords(value) {
  return value
    .replace(/(=\?[^?]+\?[BQ]\?[^?]*\?=)\s+(?==\?[^?]+\?[BQ]\?[^?]*\?=)/gi, "$1")
    .replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, charset, encoding, text) => {
      const binary =
        encoding.toUpperCase() === "B"
          ? decodeBase64(text)
          : decodeQuotedPrintable(text, { underscoreIsSpace: true });
      return decodeBytes(binaryToBytes(binary), charset);
    });
}

// Raw 8-bit header bytes are read as UTF-8 before encoded words are expanded.
function decodeHeader(value = "") {
  return decodeEncodedWords(decodeBytes(binaryToBytes(value))).trim();
}

function splitHeaderAndBody(value) {
  const match = /\r?\n\r?\n/.exec(value);
  if (!match) return { headerText: value, body: "" };
  return {
    headerText: value.slice(0, match.index),
    body: value.slice(match.index + match[0].length),
  };
}

function parseHeaders(headerText) {
  const headers = new Map();
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, " ");

  for (const line of unfolded.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    if (!headers.has(name)) headers.set(name, line.slice(separator + 1).trim());
  }

  return headers;
}

function parseContentType(value = "text/plain") {
  const [type, ...rawParams] = value.split(";");
  const params = {};
  for (const param of rawParams) {
    const match = /^\s*([^=\s]+)\s*=\s*"?([^"]*)"?\s*$/.exec(param);
    if (match) params[match[1].toLowerCase()] = match[2];
  }
  return { type: type.trim().toLowerCase(), params };
}

function decodePartBody(body, encoding, charset) {
  const normalizedEncoding = (encoding ?? "").trim().toLowerCase();
  let binary = body;
  if (normalizedEncoding === "base64") binary = decodeBase64(body);
  if (normalizedEncoding === "quoted-printable") binary = decodeQuotedPrintable(body);
  return decodeBytes(binaryToBytes(binary), charset);
}

function collectParts(binary, result, depth = 0) {
  if (depth > 10) return;
  const { headerText, body } = splitHeaderAndBody(binary);
  const headers = parseHeaders(headerText);
  const { type, params } = parseContentType(headers.get("content-type"));

  if (type.startsWith("multipart/") && params.boundary) {
    const delimiter = `--${params.boundary}`;
    const sections = body.split(delimiter).slice(1);
    for (const section of sections) {
      if (section.startsWith("--")) break;
      collectParts(section.replace(/^[ \t]*\r?\n/, ""), result, depth + 1);
    }
    return;
  }

  if (type === "text/html" && result.html === undefined) {
    result.html = decodePartBody(body, headers.get("content-transfer-encoding"), params.charset);
  } else if (type === "text/plain" && result.text === undefined) {
    result.text = decodePartBody(body, headers.get("content-transfer-encoding"), params.charset);
  }
}

export function parseRawEmail(raw) {
  const binary = toBinaryString(raw);
  const { headerText } = splitHeaderAndBody(binary);
  const headers = parseHeaders(headerText);
  const result = {};
  collectParts(binary, result);

  return {
    from: decodeHeader(headers.get("from")),
    subject: decodeHeader(headers.get("subject")),
    html: result.html ?? "",
    text: result.text ?? "",
  };
}

export function extractEmailAddress(value) {
  const match = /<([^>]+)>/.exec(value) ?? /([^\s<>]+@[^\s<>]+)/.exec(value);
  return (match?.[1] ?? "").trim().toLowerCase();
}
