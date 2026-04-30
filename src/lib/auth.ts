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

  // Legacy plaintext fallback — re-run install.ps1 to migrate
  const plain = process.env.EZAD_PASSWORD;
  if (plain) return password === plain;

  return false;
}

// Strip DOMAIN\ prefix or @domain suffix so we always work with the SAM account name.
function normalizeSam(username: string): string {
  if (username.includes("\\")) return username.split("\\")[1];
  if (username.includes("@"))  return username.split("@")[0];
  return username;
}

// Active Directory authentication.
// Validates credentials via PrincipalContext, then checks group membership
// using Get-ADGroupMember -Recursive (more reliable than IsMemberOf for
// built-in groups like Domain Admins).
// Credentials flow through process env vars — never interpolated into the script.
async function validateADCredentials(username: string, password: string): Promise<boolean> {
  const adGroup = process.env.EZAD_AD_GROUP;

  // Empty string means AD auth explicitly disabled
  if (adGroup === "") return false;

  const allowedGroup = (adGroup ?? "Domain Admins").replace(/'/g, "''");
  const sam = normalizeSam(username).replace(/'/g, "''");

  try {
    const result = await runPS<{ valid: boolean; authorized: boolean; error?: string }>(
      `
$u = $env:EZAD_AUTH_USER
$p = $env:EZAD_AUTH_PASS

# Validate credentials against the domain
Add-Type -AssemblyName System.DirectoryServices.AccountManagement
$ctx = New-Object System.DirectoryServices.AccountManagement.PrincipalContext(
    [System.DirectoryServices.AccountManagement.ContextType]::Domain)

$isValid = $ctx.ValidateCredentials($u, $p)
if (-not $isValid) {
    @{ valid = $false; authorized = $false } | ConvertTo-Json -Compress
    return
}

# Check group membership using AD module (handles recursive and protected groups)
Import-Module ActiveDirectory -ErrorAction SilentlyContinue

$isMember = $false
try {
    $members = Get-ADGroupMember -Identity '${allowedGroup}' -Recursive -ErrorAction Stop
    $isMember = [bool]($members | Where-Object { $_.SamAccountName -eq '${sam}' })
} catch {
    # Group not found or AD error — deny for safety, log reason
    @{ valid = $true; authorized = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
    return
}

@{ valid = $true; authorized = [bool]$isMember } | ConvertTo-Json -Compress
      `,
      { env: { EZAD_AUTH_USER: username, EZAD_AUTH_PASS: password } }
    );

    if (result?.error) {
      console.error("[AD auth] Group check error:", result.error);
    }

    return result?.valid === true && result?.authorized === true;
  } catch (err) {
    console.error("[AD auth] PowerShell error:", err instanceof Error ? err.message : err);
    return false;
  }
}

// Main entry point called by the login route.
// Local admin is checked first (works even when AD is unreachable).
// All other usernames go through AD.
export async function validateCredentials(username: string, password: string): Promise<boolean> {
  const localAdmin = process.env.EZAD_USERNAME ?? "admin";

  // Normalize so "DOMAIN\admin" still matches the local admin account
  if (normalizeSam(username) === localAdmin) {
    return validateLocalAdmin(localAdmin, password);
  }

  return validateADCredentials(username, password);
}
