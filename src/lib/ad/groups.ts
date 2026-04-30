import { runPS, sanitizeForPS, toJson } from "@/lib/powershell";
import type { ADGroup, ADGroupMember, ADSearchResult } from "@/types/ad";

const GROUP_PROPS = "Name,SamAccountName,DistinguishedName,GroupCategory,GroupScope,Description,Created,Modified,MemberOf,ObjectGUID,CanonicalName,ManagedBy";

const GROUP_CATEGORY_MAP = ["Security", "Distribution"] as const;
const GROUP_SCOPE_MAP = ["DomainLocal", "Global", "Universal"] as const;

function normalizeGroup(g: ADGroup): ADGroup {
  if (typeof (g.GroupCategory as unknown) === "number") {
    g.GroupCategory = GROUP_CATEGORY_MAP[(g.GroupCategory as unknown as number)] ?? "Security";
  }
  if (typeof (g.GroupScope as unknown) === "number") {
    g.GroupScope = GROUP_SCOPE_MAP[(g.GroupScope as unknown as number)] ?? "Global";
  }
  if (g.MemberOf != null && !Array.isArray(g.MemberOf)) {
    (g as Record<string, unknown>).MemberOf = [g.MemberOf];
  }
  return g;
}

export async function listGroups(search?: string): Promise<ADGroup[]> {
  const filter = search
    ? `-Filter {(Name -like '*${sanitizeForPS(search)}*') -or (SamAccountName -like '*${sanitizeForPS(search)}*')}`
    : `-Filter *`;

  const raw = await runPS<ADGroup[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADGroup ${filter} -Properties ${GROUP_PROPS} |
  Select-Object ${GROUP_PROPS} |
  ${toJson(3)}
`);

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.map(normalizeGroup);
}

export async function getGroup(samAccountName: string): Promise<ADGroup> {
  const safeId = sanitizeForPS(samAccountName, "samAccountName");
  const raw = await runPS<ADGroup>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADGroup -Identity '${safeId}' -Properties * |
  Select-Object ${GROUP_PROPS} |
  ${toJson(5)}
`);
  return normalizeGroup(raw);
}

export async function getGroupMembers(samAccountName: string): Promise<ADGroupMember[]> {
  const safeId = sanitizeForPS(samAccountName, "samAccountName");
  const raw = await runPS<ADGroupMember[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADGroupMember -Identity '${safeId}' -Recursive |
  Select-Object Name,SamAccountName,DistinguishedName,objectClass |
  ${toJson(3)}
`);
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.map((m) => ({
    ...m,
    ObjectClass: m.ObjectClass as "user" | "computer" | "group",
  }));
}

export interface CreateGroupInput {
  Name: string;
  SamAccountName: string;
  GroupScope: "DomainLocal" | "Global" | "Universal";
  GroupCategory: "Security" | "Distribution";
  Description?: string;
  Path?: string;
}

export async function createGroup(input: CreateGroupInput): Promise<ADGroup> {
  const params: string[] = [
    `-Name '${sanitizeForPS(input.Name)}'`,
    `-SamAccountName '${sanitizeForPS(input.SamAccountName, "samAccountName")}'`,
    `-GroupScope ${input.GroupScope}`,
    `-GroupCategory ${input.GroupCategory}`,
  ];

  if (input.Description) params.push(`-Description '${sanitizeForPS(input.Description)}'`);
  if (input.Path) params.push(`-Path '${sanitizeForPS(input.Path, "dn")}'`);

  await runPS(`
Import-Module ActiveDirectory -ErrorAction Stop
New-ADGroup ${params.join(" ")}
Write-Output 'null'
`);

  return getGroup(input.SamAccountName);
}

export async function addGroupMember(groupSam: string, memberSam: string): Promise<void> {
  const safeGroup = sanitizeForPS(groupSam, "samAccountName");
  const safeMember = sanitizeForPS(memberSam, "samAccountName");
  await runPS(`
Import-Module ActiveDirectory -ErrorAction Stop
Add-ADGroupMember -Identity '${safeGroup}' -Members '${safeMember}'
Write-Output 'null'
`);
}

export async function removeGroupMember(groupSam: string, memberSam: string): Promise<void> {
  const safeGroup = sanitizeForPS(groupSam, "samAccountName");
  const safeMember = sanitizeForPS(memberSam, "samAccountName");
  await runPS(`
Import-Module ActiveDirectory -ErrorAction Stop
Remove-ADGroupMember -Identity '${safeGroup}' -Members '${safeMember}' -Confirm:$false
Write-Output 'null'
`);
}

export async function searchGroups(query: string): Promise<ADSearchResult[]> {
  const safe = sanitizeForPS(query);
  const raw = await runPS<Pick<ADGroup, "Name" | "SamAccountName" | "DistinguishedName">[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADGroup -Filter {Name -like '*${safe}*'} -Properties Name,SamAccountName,DistinguishedName |
  Select-Object Name,SamAccountName,DistinguishedName |
  Select-Object -First 50 |
  ${toJson(3)}
`);

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.map((g) => ({
    type: "group" as const,
    name: g.Name,
    samAccountName: g.SamAccountName,
    distinguishedName: g.DistinguishedName,
  }));
}
