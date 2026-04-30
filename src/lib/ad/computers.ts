import { runPS, sanitizeForPS, toJson } from "@/lib/powershell";
import type { ADComputer, ADSearchResult } from "@/types/ad";

const COMP_PROPS = "Name,SamAccountName,DistinguishedName,DNSHostName,Enabled,OperatingSystem,OperatingSystemVersion,LastLogonDate,Created,Modified,IPv4Address,Description,MemberOf,ObjectGUID,CanonicalName";

function normalizeComputer(c: ADComputer): ADComputer {
  if (c.MemberOf != null && !Array.isArray(c.MemberOf)) {
    (c as Record<string, unknown>).MemberOf = [c.MemberOf];
  }
  return c;
}

export async function listComputers(ouDN?: string, search?: string): Promise<ADComputer[]> {
  const searchBase = ouDN ? `-SearchBase '${sanitizeForPS(ouDN, "dn")}'` : "";
  const filter = search
    ? `-Filter {(Name -like '*${sanitizeForPS(search)}*') -or (DNSHostName -like '*${sanitizeForPS(search)}*')}`
    : `-Filter *`;

  const raw = await runPS<ADComputer[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADComputer ${filter} ${searchBase} -Properties ${COMP_PROPS} |
  Select-Object ${COMP_PROPS} |
  ${toJson(3)}
`);

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.map(normalizeComputer);
}

export async function getComputer(name: string): Promise<ADComputer> {
  const safeName = sanitizeForPS(name, "samAccountName");
  const raw = await runPS<ADComputer>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADComputer -Identity '${safeName}' -Properties * |
  Select-Object ${COMP_PROPS} |
  ${toJson(5)}
`);
  return normalizeComputer(raw);
}

export async function searchComputers(query: string): Promise<ADSearchResult[]> {
  const safe = sanitizeForPS(query);
  const raw = await runPS<Pick<ADComputer, "Name" | "SamAccountName" | "DistinguishedName" | "Enabled">[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADComputer -Filter {Name -like '*${safe}*'} -Properties Name,SamAccountName,DistinguishedName,Enabled |
  Select-Object Name,SamAccountName,DistinguishedName,Enabled |
  Select-Object -First 50 |
  ${toJson(3)}
`);

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.map((c) => ({
    type: "computer" as const,
    name: c.Name,
    samAccountName: c.SamAccountName,
    distinguishedName: c.DistinguishedName,
    enabled: c.Enabled,
  }));
}
