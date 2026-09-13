import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFriendsCsv } from "../../scripts/friends-csv.js";

const header = "name,discordUserId,birthday\n";
const id = "123456789012345678";

test("CSV preserves IDs and supports spreadsheet quoting, BOM and CRLF", () => {
  assert.deepEqual(parseFriendsCsv(`\uFEFF${header}\r\n"Alex, \"\"Al\"\"\nSmith",${id}, February 29 \r\n`), [
    { discordUserId: id, birthday: "February 29" },
  ]);
  assert.deepEqual(parseFriendsCsv(`${header}Alex,${id},January 15`), [
    { discordUserId: id, birthday: "January 15" },
  ]);
  assert.deepEqual(parseFriendsCsv(header), []);
});

test("CSV rejects malformed input and unsafe birthday updates", () => {
  for (const [body, pattern] of [
    [`Alex,${id},April 31`, /valid date/],
    ["Alex,1.23456789012345E+17,January 15", /Discord user ID/],
    [`Alex,${id},January 15\nSam,${id},March 22`, /duplicate/],
    [`Alex,${id}`, /three columns/],
    [`,${id},January 15`, /needs a name/],
    ['"Alex', /unclosed/],
    [`"Alex"x,${id},January 15`, /quoting/],
    [`Al"ex,${id},January 15`, /quoting/],
  ]) assert.throws(() => parseFriendsCsv(header + body), pattern);
  assert.throws(() => parseFriendsCsv(""), /header/);
  assert.throws(() => parseFriendsCsv("name,birthday,discordUserId"), /header/);
});
