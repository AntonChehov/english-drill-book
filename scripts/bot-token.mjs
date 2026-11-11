#!/usr/bin/env node
// Prints a one-hour installation token of the project's GitHub App (design D11),
// so that agents commit and open pull requests as the bot.
// Environment:
//   BOT_APP_ID                the App's ID
//   BOT_PRIVATE_KEY_PATH      path to the App's private key (kept outside the repository)
//   BOT_INSTALLATION_ID       optional; without it the App must have exactly one installation
// Usage: GH_TOKEN=$(node scripts/bot-token.mjs) gh api /installation/repositories
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { isMain } from "./common.mjs";
import { createGithub } from "./github.mjs";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

/**
 * A JSON Web Token that authenticates as the App itself, signed with RS256.
 * `now` is in seconds; the token is backdated a minute against clock drift and
 * lives nine minutes, under GitHub's limit of ten.
 */
export function appJwt(appId, privateKeyPem, now) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) }));
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(privateKeyPem),
  });
  return `${header}.${payload}.${signature.toString("base64url")}`;
}

/** Reads the configuration from the environment; throws naming what is missing. */
export function readConfig(env) {
  const missing = ["BOT_APP_ID", "BOT_PRIVATE_KEY_PATH"].filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`Set ${missing.join(" and ")} in the environment.`);
  return {
    appId: env["BOT_APP_ID"],
    privateKeyPath: env["BOT_PRIVATE_KEY_PATH"],
    installationId: env["BOT_INSTALLATION_ID"] || undefined,
  };
}

/** Exchanges the App's JWT for an installation token. */
export async function installationToken(config, now = Math.floor(Date.now() / 1000)) {
  const jwt = appJwt(config.appId, readFileSync(config.privateKeyPath, "utf8"), now);
  const github = createGithub({ token: jwt });
  let installationId = config.installationId;
  if (!installationId) {
    const installations = await github.request("GET", "/app/installations");
    if (installations.length !== 1) {
      throw new Error(
        `The App has ${installations.length} installations; set BOT_INSTALLATION_ID.`,
      );
    }
    installationId = installations[0].id;
  }
  const { token } = await github.request(
    "POST",
    `/app/installations/${installationId}/access_tokens`,
  );
  return token;
}

async function main() {
  try {
    process.stdout.write(`${await installationToken(readConfig(process.env))}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) await main();
