import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32
  });
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return argonVerify(hashed, plain);
}

export function generateRawToken(size = 48): string {
  return randomBytes(size).toString("hex");
}

export function hashOpaqueToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
