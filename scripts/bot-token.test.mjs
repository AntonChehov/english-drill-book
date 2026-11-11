import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { appJwt, readConfig } from "./bot-token.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

function decode(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe("appJwt", () => {
  const jwt = appJwt(5713395, pem, 1_000_000);
  const [header, payload, signature] = jwt.split(".");

  it("is an RS256 token issued by the App", () => {
    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decode(payload)).toEqual({ iat: 999_940, exp: 1_000_540, iss: "5713395" });
  });

  it("is signed with the private key", () => {
    const valid = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      publicKey,
      Buffer.from(signature, "base64url"),
    );
    expect(valid).toBe(true);
  });

  it("lives less than the ten minutes GitHub allows", () => {
    const { iat, exp } = decode(payload);
    expect(exp - iat).toBeLessThanOrEqual(600);
  });
});

describe("readConfig", () => {
  it("reads the App ID, the key path and an optional installation", () => {
    expect(
      readConfig({ BOT_APP_ID: "1", BOT_PRIVATE_KEY_PATH: "/k.pem", BOT_INSTALLATION_ID: "2" }),
    ).toEqual({ appId: "1", privateKeyPath: "/k.pem", installationId: "2" });
    expect(readConfig({ BOT_APP_ID: "1", BOT_PRIVATE_KEY_PATH: "/k.pem" }).installationId).toBe(
      undefined,
    );
  });

  it("names every missing variable", () => {
    expect(() => readConfig({})).toThrow("Set BOT_APP_ID and BOT_PRIVATE_KEY_PATH");
    expect(() => readConfig({ BOT_APP_ID: "1" })).toThrow("Set BOT_PRIVATE_KEY_PATH");
  });
});
