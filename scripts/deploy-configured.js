import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseFriendsCsv } from "./friends-csv.js";
import { validateWebhookUrl } from "../src/config.js";

let directory;
try {
  const friends = parseFriendsCsv(await readFile(new URL("../friends.csv", import.meta.url), "utf8"));
  if (!friends.length) throw new Error("Add friends to friends.csv before the initial deployment.");
  const webhook = validateWebhookUrl(process.env.DISCORD_WEBHOOK_URL);
  directory = await mkdtemp(join(tmpdir(), "rodeobot-secrets-"));
  const secretsPath = join(directory, "secrets.json");
  await writeFile(secretsPath, JSON.stringify({
    DISCORD_WEBHOOK_URL: webhook,
    FRIENDS_JSON: JSON.stringify(friends),
  }), { mode: 0o600 });
  console.log(`Deploying with validated configuration for ${friends.length} friend(s).`);
  const child = spawn(process.execPath, [
    fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
    "deploy", "--secrets-file", secretsPath,
  ], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: "inherit",
  });
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  if (code !== 0) throw new Error("Deployment failed; see Wrangler output above.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (directory) await rm(directory, { recursive: true, force: true });
}
