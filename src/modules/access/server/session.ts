const encoder = new TextEncoder();

export interface SessionPayload {
  userId: string;
  restaurantId: string;
  email: string;
  name: string;
  roleCodes: string[];
  issuedAt: string;
  expiresAt: string;
}

function base64UrlEncode(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeBytes(value: ArrayBuffer) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value).toString("base64url");
  }

  const binary = Array.from(new Uint8Array(value), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);

  return atob(padded);
}

function base64UrlDecodeBytes(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64url"));
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodePayload(payload: SessionPayload) {
  return base64UrlEncode(JSON.stringify(payload));
}

function decodePayload(value: string) {
  try {
    return JSON.parse(base64UrlDecode(value)) as SessionPayload;
  } catch {
    return null;
  }
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify"
  ]);
}

async function signPayload(encodedPayload: string, secret: string) {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));

  return base64UrlEncodeBytes(signature);
}

export async function createSignedSessionToken(payload: SessionPayload, secret: string) {
  const encodedPayload = encodePayload(payload);
  const signature = await signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function readSignedSessionToken(
  token: string | undefined,
  secret: string,
  now = new Date()
) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const payload = decodePayload(encodedPayload);

  if (!payload) {
    return null;
  }

  const key = await importSigningKey(secret);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecodeBytes(signature),
    encoder.encode(encodedPayload)
  );

  if (!isValid) {
    return null;
  }

  if (new Date(payload.expiresAt).getTime() <= now.getTime()) {
    return null;
  }

  return payload;
}
