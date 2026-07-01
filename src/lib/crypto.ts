import crypto from "node:crypto";

// AES-256-GCM. A chave (32 bytes / 64 hex) vem de APP_ENCRYPTION_KEY (só servidor).
// Este módulo só pode ser importado em código de servidor (actions / data layer).

function getKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex) throw new Error("APP_ENCRYPTION_KEY não configurada no .env.local");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hex)");
  }
  return key;
}

/** Retorna "iv:tag:ciphertext" (todos em base64). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Decifra "iv:tag:ciphertext". Retorna "" se falhar (chave errada/dado corrompido). */
export function decryptSecret(payload: string): string {
  try {
    const [ivB, tagB, dataB] = payload.split(":");
    if (!ivB || !tagB || !dataB) return "";
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}
