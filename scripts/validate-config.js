import { loadWorkerConfig } from "../src/config.js";

const { friends } = loadWorkerConfig(process.env);
console.log(`Configuration is valid for ${friends.length} friend(s).`);
