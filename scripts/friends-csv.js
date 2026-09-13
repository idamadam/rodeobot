import { parseFriends } from "../src/config.js";

// Supports spreadsheet CSV exports: quoted commas/newlines, doubled quotes,
// UTF-8 BOMs, and Windows line endings. IDs always remain strings.
export function parseFriendsCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const input = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field.trim());
      field = "";
      closed = false;
      if (char !== ',') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === '\r' && input[i + 1] === '\n') i++;
      }
    } else if (char === '"' && !field && !closed) {
      quoted = true;
    } else {
      if (closed || char === '"') throw new Error("CSV has invalid quoting.");
      field += char;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.shift()?.join(',') !== 'name,discordUserId,birthday') {
    throw new Error("CSV header must be name,discordUserId,birthday.");
  }
  const seen = new Set();
  return rows.map((columns, index) => {
    const label = `CSV record ${index + 2}`;
    if (columns.length !== 3) throw new Error(`${label} must have three columns.`);
    const [name, discordUserId, birthday] = columns;
    if (!name) throw new Error(`${label} needs a name.`);
    let friend;
    try {
      [friend] = parseFriends(JSON.stringify([{ discordUserId, birthday }]));
    } catch (error) {
      throw new Error(`${label}: ${error.message}`);
    }
    if (seen.has(discordUserId)) throw new Error(`${label} has a duplicate Discord user ID.`);
    seen.add(discordUserId);
    return friend;
  });
}
