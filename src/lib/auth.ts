import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type MerchantTokenPayload = {
  merchantId: string;
  email: string;
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

export function verifyMerchantToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as MerchantTokenPayload;
}
