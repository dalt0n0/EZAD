import { runPS, runPSRaw, sanitizeForPS, toJson } from "@/lib/powershell";
import type { GPO, GPOLink, GPOInheritance, GPOReport, GPOSetting } from "@/types/gpo";
import { XMLParser } from "fast-xml-parser";

export async function listGPOs(): Promise<GPO[]> {
  const raw = await runPS<GPO[]>(`
Import-Module GroupPolicy -ErrorAction Stop
Get-GPO -All |
  Select-Object DisplayName,Id,DomainName,Owner,GpoStatus,Description,CreationTime,ModificationTime,UserVersion,ComputerVersion,WmiFilter |
  ${toJson(4)}
`);
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

export async function getGPO(id: string): Promise<GPO> {
  const safeId = sanitizeForPS(id, "guid");
  const raw = await runPS<GPO>(`
Import-Module GroupPolicy -ErrorAction Stop
Get-GPO -Guid '${safeId}' |
  Select-Object DisplayName,Id,DomainName,Owner,GpoStatus,Description,CreationTime,ModificationTime,UserVersion,ComputerVersion,WmiFilter |
  ${toJson(4)}
`);
  return raw;
}

export async function getGPOLinks(ouDN: string): Promise<GPOLink[]> {
  const safeDN = sanitizeForPS(ouDN, "dn");
  const raw = await runPS<{ GpoLinks: GPOLink[] }>(`
Import-Module GroupPolicy -ErrorAction Stop
$inherit = Get-GPInheritance -Target '${safeDN}'
@{
  GpoLinks = $inherit.GpoLinks | Select-Object Target,DisplayName,Enabled,Enforced,Order,GpoId
} | ${toJson(4)}
`);
  return raw?.GpoLinks ?? [];
}

export async function getGPOInheritance(ouDN: string): Promise<GPOInheritance> {
  const safeDN = sanitizeForPS(ouDN, "dn");
  const raw = await runPS<GPOInheritance>(`
Import-Module GroupPolicy -ErrorAction Stop
$inherit = Get-GPInheritance -Target '${safeDN}'
@{
  Path = $inherit.Path
  BlockInheritance = $inherit.BlockInheritance
  GpoLinks = @($inherit.GpoLinks | Select-Object Target,DisplayName,Enabled,Enforced,Order,GpoId)
  InheritedGpoLinks = @($inherit.InheritedGpoLinks | Select-Object Target,DisplayName,Enabled,Enforced,Order,GpoId)
} | ${toJson(4)}
`);
  return raw;
}

export async function getGPOReport(id: string): Promise<GPOReport> {
  const safeId = sanitizeForPS(id, "guid");

  const xmlOutput = await runPSRaw(`
Import-Module GroupPolicy -ErrorAction Stop
Get-GPOReport -Guid '${safeId}' -ReportType XML
`);

  const gpo = await getGPO(id);
  const links = await getGPOLinksForGPO(id);
  const settings = parseGPOSettingsFromXml(xmlOutput.trim());

  return { gpo, links, settings, rawXml: xmlOutput.trim() };
}

async function getGPOLinksForGPO(id: string): Promise<GPOLink[]> {
  const safeId = sanitizeForPS(id, "guid");
  try {
    const raw = await runPS<GPOLink[]>(`
Import-Module GroupPolicy -ErrorAction Stop
$gpo = Get-GPO -Guid '${safeId}'
$report = [xml](Get-GPOReport -Guid '${safeId}' -ReportType XML)
$links = @()
foreach ($link in $report.GPO.LinksTo) {
  $links += @{
    Target = $link.SOMPath
    DisplayName = $gpo.DisplayName
    Enabled = [bool]$link.Enabled
    Enforced = [bool]$link.NoOverride
    Order = 0
    GPOId = '${safeId}'
  }
}
$links | ${toJson(3)}
`);
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
  } catch {
    return [];
  }
}

function parseGPOSettingsFromXml(xml: string): GPOSetting[] {
  if (!xml) return [];

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: () => false,
  });

  try {
    const parsed = parser.parse(xml);
    const settings: GPOSetting[] = [];
    const gpoNode = parsed?.GPO;
    if (!gpoNode) return [];

    extractSettings(gpoNode?.Computer, "Computer Configuration", settings);
    extractSettings(gpoNode?.User, "User Configuration", settings);

    return settings;
  } catch {
    return [];
  }
}

function extractSettings(
  node: Record<string, unknown> | null | undefined,
  category: "Computer Configuration" | "User Configuration",
  results: GPOSetting[]
): void {
  if (!node || typeof node !== "object") return;

  function walk(obj: unknown, path: string[]): void {
    if (!obj || typeof obj !== "object") return;

    const record = obj as Record<string, unknown>;
    for (const [key, val] of Object.entries(record)) {
      if (key.startsWith("@_")) continue;
      if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
        results.push({
          category,
          section: path[0] ?? "",
          name: [...path.slice(1), key].join(" > ") || key,
          value: String(val),
          dropPath: [...path, key].join(" > "),
          state: undefined,
        });
      } else if (typeof val === "object" && val !== null) {
        walk(val, [...path, key]);
      }
    }
  }

  walk(node, [category]);
}
