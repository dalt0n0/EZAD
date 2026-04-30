import { runPS, toJson } from "@/lib/powershell";
import type { ADDomain, ADStats } from "@/types/ad";

export async function getDomain(): Promise<ADDomain> {
  const raw = await runPS<ADDomain>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADDomain | Select-Object Name,DNSRoot,NetBIOSName,DomainMode,Forest,PDCEmulator,RIDMaster,InfrastructureMaster,DistinguishedName | ${toJson(3)}
`);
  return raw;
}

export async function getStats(): Promise<ADStats> {
  const raw = await runPS<{
    userCount: number;
    computerCount: number;
    groupCount: number;
    ouCount: number;
    enabledUsers: number;
    disabledUsers: number;
    domain: ADDomain;
  }>(`
Import-Module ActiveDirectory -ErrorAction Stop
$domain = Get-ADDomain | Select-Object Name,DNSRoot,NetBIOSName,DomainMode,Forest,PDCEmulator,RIDMaster,InfrastructureMaster,DistinguishedName
$users = Get-ADUser -Filter * -Properties Enabled
$computers = Get-ADComputer -Filter *
$groups = Get-ADGroup -Filter *
$ous = Get-ADOrganizationalUnit -Filter *
@{
  userCount = ($users | Measure-Object).Count
  computerCount = ($computers | Measure-Object).Count
  groupCount = ($groups | Measure-Object).Count
  ouCount = ($ous | Measure-Object).Count
  enabledUsers = ($users | Where-Object { $_.Enabled -eq $true } | Measure-Object).Count
  disabledUsers = ($users | Where-Object { $_.Enabled -eq $false } | Measure-Object).Count
  domain = $domain
} | ${toJson(4)}
`);
  return raw;
}
