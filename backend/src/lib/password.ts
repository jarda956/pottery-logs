import argon2 from "argon2";
import crypto from "crypto";

const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, OWASP-recommended minimum for argon2id
  timeCost: 2,
  parallelism: 1,
};

export function hashSecret(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

export async function verifySecret(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

const MIN_PASSWORD_LENGTH = 10;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `password_too_short`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return `password_too_weak`;
  }
  return null;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}
