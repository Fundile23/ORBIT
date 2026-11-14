import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// SESSION_SECRET is a stable server-only root, not a Clerk credential.
// Rotating it requires re-encrypting all existing data first.
const root = process.env.SESSION_SECRET;
if (!root) throw new Error("SESSION_SECRET is required to encrypt ORBIT data.");
const key = Buffer.from(hkdfSync("sha256", root, "orbit-private-data-v1", "aes-256-gcm", 32));

export function seal(plaintext: string, owner: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(owner));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

export function unseal(value: string, owner: string): string {
  const [version, iv, tag, body] = value.split(".");
  if (version !== "v1" || !iv || !tag || body === undefined) throw new Error("Invalid encrypted record");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(owner));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}
