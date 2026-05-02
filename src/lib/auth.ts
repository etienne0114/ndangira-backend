import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthRole = "SELLER" | "ADMIN";

type BaseTokenPayload = {
  role: AuthRole;
  email: string;
};

type MerchantTokenPayload = BaseTokenPayload & {
  role: "SELLER";
  merchantId: string;
};

type AdminTokenPayload = BaseTokenPayload & {
  role: "ADMIN";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signMerchantToken(payload: MerchantTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function signAdminToken(payload: AdminTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as MerchantTokenPayload | AdminTokenPayload;
}
