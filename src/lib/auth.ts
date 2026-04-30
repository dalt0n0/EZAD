import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { runPS } from "./powershell";

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

// Local admin account — password stored as bcrypt hash in EZAD_PASSWORD_HASH.
// Falls back to plaintext EZAD_PASSWORD for installs that haven't been updated yet.
async function validateLocalAdmin(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.EZAD_USERNAME ?? "admin";
  if (username !== expectedUser) return false;

  const hash = process.env.EZAD_PASSWORD_HASH;
  if (hash) return compare(password, hash);

  // Legacy plaintext fallback — remove after re-running install.ps1
  const plain = process.env.EZAD_PASSWORD;
  if (plain) return password === plain;

  return false;
}

// Active Directory authentication via PrincipalContext.ValidateCredentials.
// User must be a member of EZAD_AD_GROUP (defaults to "Domain Admins").
// Credentials are passed through process env vars, never interpolated into the script.
async function validateADCredentials(username: string, password: string): Promise<boolean> {
  const allowedGroup = (process.env.EZAD_AD_GROUP ?? "Domain Admins").replace(/'/g, "''");

  try {
    const result = await runPS<{ valid: boolean; authorized: boolean }>(
      `
$u = $env:EZAD_AUTH_USER
$p = $env:EZAD_AUTH_PASS

Add-Type -AssemblyName System.DirectoryServices.AccountManagement
$ctx = New-Object System.DirectoryServices.AccountManagement.PrincipalContext(
    [System.DirectoryServices.AccountManagement.ContextType]::Domain)

$isValid = $ctx.ValidateCredentials($u, $p)
if (-not $isValid) {
    @{ valid = $false; authorized = $false } | ConvertTo-Json -Compress
    return
}

$user  = [System.DirectoryServices.AccountManagement.UserPrincipal]::FindByIdentity($ctx, $u)
$group = [System.DirectoryServices.AccountManagement.GroupPrincipal]::FindByIdentity($ctx, '${allowedGroup}')
$ok    = $user -ne $null -and $group -ne $null -and $user.IsMemberOf($group)

@{ valid = $true; authorized = [bool]$ok } | ConvertTo-Json -Compress
      `,
      { env: { EZAD_AUTH_USER: username, EZAD_AUTH_PASS: password } }
    );

    return result?.valid === true && result?.authorized === true;
  } catch {
    return false;
  }
}

// Main entry point called by the login route.
// Local admin is checked first (works even if AD is unreachable).
// All other usernames go through AD.
export async function validateCredentials(username: string, password: string): Promise<boolean> {
  const localAdmin = process.env.EZAD_USERNAME ?? "admin";
  if (username === localAdmin) return validateLocalAdmin(username, password);
  return validateADCredentials(username, password);
}
