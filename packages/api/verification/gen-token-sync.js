import { issueJWT } from "../src/auth/jwt.js";
import fs from "fs";

// Read from .dev.vars
const vars = fs.readFileSync("../.dev.vars", "utf8");
const match = vars.match(/JWT_SECRET="([^"]+)"/);
const secret = match ? match[1] : null;

if (!secret) {
  console.error("JWT_SECRET not found in .dev.vars");
  process.exit(1);
}

const env = {
  JWT_SECRET: secret
};

const payload = {
  user_id: "eae8f889-3144-437f-a781-a9254c5922eb",
  brand_id: "9ff02ce1-2b39-439f-884c-93b9971b71ae",
  email: "v1_final_1774001049@example.com",
  role: "customer"
};

async function run() {
  const token = await issueJWT(payload, env);
  console.log(token);
}

run();
