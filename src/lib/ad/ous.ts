import { runPS, toJson } from "@/lib/powershell";
import type { ADOU } from "@/types/ad";

interface RawOU {
  Name: string;
  DistinguishedName: string;
  Description?: string;
  CanonicalName?: string;
}

export async function listOUs(): Promise<ADOU[]> {
  const raw = await runPS<RawOU[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADOrganizationalUnit -Filter * -Properties Name,DistinguishedName,Description,CanonicalName |
  Select-Object Name,DistinguishedName,Description,CanonicalName |
  ${toJson(3)}
`);

  const ous = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return buildOUTree(ous);
}

function buildOUTree(flat: RawOU[]): ADOU[] {
  const map = new Map<string, ADOU>();
  const roots: ADOU[] = [];

  for (const ou of flat) {
    map.set(ou.DistinguishedName, {
      Name: ou.Name,
      DistinguishedName: ou.DistinguishedName,
      Description: ou.Description,
      CanonicalName: ou.CanonicalName,
      children: [],
    });
  }

  for (const ou of flat) {
    const node = map.get(ou.DistinguishedName)!;
    const parentDN = getParentDN(ou.DistinguishedName);
    const parent = parentDN ? map.get(parentDN) : null;
    if (parent) {
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function getParentDN(dn: string): string | null {
  const idx = dn.indexOf(",");
  if (idx === -1) return null;
  return dn.slice(idx + 1);
}
