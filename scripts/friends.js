import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseFriendsCsv } from "./friends-csv.js";

try {
  const [action, ...args] = process.argv.slice(2);
  if (!["validate", "upload"].includes(action) || args.some(arg => arg !== "--allow-empty")) {
    throw new Error("Usage: npm run friends:validate | npm run friends:upload [-- --allow-empty]");
  }
  const friends = parseFriendsCsv(await readFile(new URL("../friends.csv", import.meta.url), "utf8"));
  console.log(`friends.csv is valid: ${friends.length} friend(s).`);
  if (action === "upload") {
    if (!friends.length && !args.includes("--allow-empty")) {
      throw new Error("Refusing to replace birthdays with an empty list. Use --allow-empty to intentionally clear it.");
    }
    // Pass private data over stdin, never through shell arguments or a JSON file.
    const child = spawn(process.execPath, [
      fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
      "secret", "put", "FRIENDS_JSON",
    ], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.stdin.on("error", () => {}); // Wrangler may exit before reading stdin.
    child.stdin.end(JSON.stringify(friends));
    const code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    if (code !== 0) throw new Error("Cloudflare upload failed; see Wrangler output above.");
    console.log("Birthday data uploaded to Cloudflare.");
  }
} catch (error) {
  console.error(error.code === "ENOENT"
    ? "friends.csv is missing. Copy friends.example.csv to friends.csv and edit it first."
    : error.message);
  process.exitCode = 1;
}
