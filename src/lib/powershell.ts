import { spawn } from "child_process";

export class PowerShellError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly script?: string
  ) {
    super(message);
    this.name = "PowerShellError";
  }
}

export async function runPS<T = unknown>(
  script: string,
  opts?: { env?: Record<string, string> }
): Promise<T> {
  return new Promise((resolve, reject) => {
    const fullScript = `
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  ${script}
} catch {
  Write-Output (ConvertTo-Json @{ __error = $true; message = $_.Exception.Message; type = $_.Exception.GetType().Name } -Compress)
}
`;

    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      fullScript,
    ], {
      windowsHide: true,
      env: { ...process.env, TERM: "dumb", ...opts?.env },
    });

    let stdout = "";
    let stderr = "";

    ps.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    ps.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    ps.on("close", (code) => {
      const output = stdout.trim();

      if (!output) {
        if (code !== 0 || stderr) {
          reject(new PowerShellError(
            stderr || `PowerShell exited with code ${code}`,
            stderr,
            script
          ));
          return;
        }
        resolve(null as T);
        return;
      }

      try {
        const parsed = JSON.parse(output);
        if (parsed && typeof parsed === "object" && "__error" in parsed && parsed.__error) {
          reject(new PowerShellError(parsed.message, stderr, script));
          return;
        }
        resolve(parsed as T);
      } catch {
        resolve(output as unknown as T);
      }
    });

    ps.on("error", (err) => {
      reject(new PowerShellError(err.message, "", script));
    });
  });
}

export async function runPSRaw(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fullScript = `
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
${script}
`;

    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      fullScript,
    ], {
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    ps.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    ps.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    ps.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new PowerShellError(stderr || `Exit code ${code}`, stderr, script));
        return;
      }
      resolve(stdout);
    });

    ps.on("error", (err) => {
      reject(new PowerShellError(err.message, "", script));
    });
  });
}

// Validate and escape values used in PS filter strings to prevent injection
export function sanitizeForPS(value: string, type: "samAccountName" | "dn" | "guid" | "name" | "any" = "any"): string {
  if (type === "guid") {
    if (!/^[0-9a-f-]{36}$/i.test(value)) {
      throw new Error(`Invalid GUID: ${value}`);
    }
    return value;
  }
  if (type === "samAccountName") {
    if (!/^[a-zA-Z0-9._\-$ ]{1,256}$/.test(value)) {
      throw new Error(`Invalid sAMAccountName: ${value}`);
    }
  }
  if (type === "dn") {
    if (!/^(CN|OU|DC)=[^,]+(,(CN|OU|DC)=[^,]+)*$/.test(value)) {
      throw new Error(`Invalid Distinguished Name: ${value}`);
    }
  }
  // Escape single quotes for PS string literals
  return value.replace(/'/g, "''");
}

export function toJson(depth = 5): string {
  return `ConvertTo-Json -Depth ${depth} -Compress`;
}
