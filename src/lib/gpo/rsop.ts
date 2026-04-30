import { runPSRaw, sanitizeForPS } from "@/lib/powershell";
import type { RSoPResult, RSoPGPO } from "@/types/gpo";
import { XMLParser } from "fast-xml-parser";

export async function getRSoP(username: string, computer?: string): Promise<RSoPResult> {
  const safeUser = sanitizeForPS(username, "samAccountName");

  let xmlOutput: string;

  if (computer) {
    const safeComp = sanitizeForPS(computer, "samAccountName");
    xmlOutput = await runPSRaw(`
Import-Module GroupPolicy -ErrorAction Stop
Get-GPResultantSetOfPolicy -User '${safeUser}' -Computer '${safeComp}' -ReportType XML
`);
  } else {
    xmlOutput = await runPSRaw(`
Import-Module GroupPolicy -ErrorAction Stop
Get-GPResultantSetOfPolicy -User '${safeUser}' -ReportType XML
`);
  }

  return parseRSoPXml(xmlOutput.trim(), username, computer);
}

function parseRSoPXml(xml: string, user: string, computer?: string): RSoPResult {
  if (!xml) {
    return {
      user,
      computer,
      appliedGPOs: [],
      deniedGPOs: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => ["GPO", "AppliedGPOs", "DeniedGPOs"].includes(name),
  });

  try {
    const parsed = parser.parse(xml);
    const rsop = parsed?.Rsop ?? parsed?.["rsop:Rsop"] ?? parsed;

    const appliedGPOs: RSoPGPO[] = [];
    const deniedGPOs: RSoPGPO[] = [];

    // Try to extract from UserResults > ExtensionData or top-level GPO lists
    const userResults = rsop?.UserResults ?? rsop?.["rsop:UserResults"];
    const gpoList = rsop?.GPOs?.GPO ?? userResults?.GPO ?? [];
    const gpoArr = Array.isArray(gpoList) ? gpoList : gpoList ? [gpoList] : [];

    for (const gpo of gpoArr) {
      const entry: RSoPGPO = {
        Name: gpo.Name ?? gpo.DisplayName ?? "Unknown",
        Id: gpo.Id ?? gpo.Identifier?.Identifier?.["#text"] ?? "",
        LinkLocation: gpo.LinkLocation ?? gpo.SOMOrder?.SOMPath ?? "",
        Precedence: parseInt(gpo.Precedence ?? gpo.AccessDeniedReason ?? "0") || 0,
        Enabled: gpo.Enabled !== "false" && gpo.Enabled !== false,
        Enforced: gpo.IsEnforced === "true" || gpo.IsEnforced === true,
        AccessDenied: gpo.AccessDenied === "true" || gpo.AccessDenied === true,
        FilterAllowed: gpo.FilterAllowed !== "false",
        Reason: gpo.AccessDeniedReason,
      };

      if (entry.AccessDenied) {
        deniedGPOs.push(entry);
      } else {
        appliedGPOs.push(entry);
      }
    }

    return {
      user,
      computer,
      appliedGPOs,
      deniedGPOs,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      user,
      computer,
      appliedGPOs: [],
      deniedGPOs: [],
      generatedAt: new Date().toISOString(),
    };
  }
}
