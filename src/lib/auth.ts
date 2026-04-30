import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.EZAD_SECRET ?? "dev-secret-change-in-production"
);

export const COOKIE_NAME = "ezad_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export async function createSession(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function validateCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.EZAD_USERNAME ?? "admin";
  const expectedPass = process.env.EZAD_PASSWORD;
  if (!expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}
