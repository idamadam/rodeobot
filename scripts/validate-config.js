import { loadNewsletterConfig, loadWorkerConfig } from "../src/config.js";

const { friends } = loadWorkerConfig(process.env);
console.log(`Configuration is valid for ${friends.length} friend(s).`);

if (process.env.LETTERLOOP_WEBHOOK_URL) {
  loadNewsletterConfig(process.env);
  console.log("Letterloop webhook URL is valid.");
}
