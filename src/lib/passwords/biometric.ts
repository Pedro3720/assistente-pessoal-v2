"use client";

/**
 * Trava de conveniência do cofre com biometria (Face ID / Touch ID) via WebAuthn.
 *
 * IMPORTANTE: é uma trava de INTERFACE, no dispositivo. Ela impede que alguém com o
 * celular desbloqueado bisbilhote o cofre, mas NÃO substitui a autenticação do servidor
 * (o `revealPassword` continua protegido apenas pela sessão do Supabase). Escolha
 * consciente do dono do projeto (ver spec do PWA, Fase 3c).
 */

const CRED_KEY = "vault-biometric-cred";

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(b64 + pad);
  const buf = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return buf;
}

/** O dispositivo tem autenticador de plataforma (Face ID / Touch ID / Windows Hello)? */
export async function biometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** A proteção do cofre está ativa neste dispositivo? */
export function vaultProtected(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(CRED_KEY));
}

/** Registra a credencial de plataforma e liga a proteção. Lança em caso de erro/cancelamento. */
export async function enableVaultProtection(): Promise<void> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Zênite", id: window.location.hostname },
      user: { id: userId, name: "cofre", displayName: "Cofre Zênite" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Não foi possível registrar a biometria");
  localStorage.setItem(CRED_KEY, bufferToBase64url(cred.rawId));
}

/** Pede a biometria para destravar. Resolve se o usuário foi verificado. */
export async function unlockWithBiometric(): Promise<void> {
  const stored = localStorage.getItem(CRED_KEY);
  if (!stored) throw new Error("Proteção não configurada neste dispositivo");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{ id: base64urlToBuffer(stored), type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  if (!assertion) throw new Error("Biometria não confirmada");
}

/** Desliga a proteção (evita ficar trancado fora do próprio cofre). */
export function disableVaultProtection(): void {
  localStorage.removeItem(CRED_KEY);
}
