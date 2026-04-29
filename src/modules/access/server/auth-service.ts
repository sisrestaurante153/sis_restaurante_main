import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export interface AuthUserRecord {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  senhaHash: string | null;
  roleCodes: string[];
}

interface AuthenticateByPasswordInput {
  email: string;
  password: string;
  findUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
}

const KEY_LENGTH = 64;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertPasswordPolicy(password: string) {
  if (password.length < 8) {
    throw new Error("Senha deve ter no minimo 8 caracteres.");
  }
}

export async function hashPassword(password: string) {
  assertPasswordPolicy(password);
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, expectedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const passwordBuffer = scryptSync(password, salt, KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (passwordBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordBuffer, expectedBuffer);
}

export async function authenticateByPassword({
  email,
  password,
  findUserByEmail
}: AuthenticateByPasswordInput) {
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      ok: false as const,
      message: "Credenciais invalidas."
    };
  }

  if (!user.ativo) {
    return {
      ok: false as const,
      message: "Usuario inativo."
    };
  }

  const isValidPassword = await verifyPassword(password, user.senhaHash);

  if (!isValidPassword) {
    return {
      ok: false as const,
      message: "Credenciais invalidas."
    };
  }

  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email,
      nome: user.nome,
      roleCodes: user.roleCodes
    }
  };
}
