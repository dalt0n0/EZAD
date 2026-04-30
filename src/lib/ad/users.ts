import { runPS, sanitizeForPS, toJson } from "@/lib/powershell";
import type { ADUser, ADSearchResult } from "@/types/ad";

const USER_PROPS = "SamAccountName,DistinguishedName,Name,DisplayName,GivenName,Surname,UserPrincipalName,EmailAddress,Title,Department,Company,Enabled,LockedOut,LastLogonDate,Created,Modified,MemberOf,ObjectGUID,CanonicalName,Description,OfficePhone,MobilePhone,Manager,StreetAddress,City,State,PostalCode,Country,Office,PasswordExpired,PasswordNeverExpires";

export async function listUsers(ouDN?: string, search?: string): Promise<ADUser[]> {
  const searchBase = ouDN ? `-SearchBase '${sanitizeForPS(ouDN, "dn")}'` : "";
  const filter = search
    ? `-Filter {(SamAccountName -like '*${sanitizeForPS(search)}*') -or (DisplayName -like '*${sanitizeForPS(search)}*') -or (EmailAddress -like '*${sanitizeForPS(search)}*')}`
    : `-Filter *`;

  const raw = await runPS<ADUser[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADUser ${filter} ${searchBase} -Properties ${USER_PROPS} |
  Select-Object ${USER_PROPS} |
  ${toJson(3)}
`);

  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

export async function getUser(id: string): Promise<ADUser> {
  const safeId = sanitizeForPS(id, "samAccountName");
  const raw = await runPS<ADUser>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADUser -Identity '${safeId}' -Properties * |
  Select-Object ${USER_PROPS} |
  ${toJson(5)}
`);
  return raw;
}

export interface CreateUserInput {
  Name: string;
  SamAccountName: string;
  GivenName?: string;
  Surname?: string;
  UserPrincipalName?: string;
  EmailAddress?: string;
  Title?: string;
  Department?: string;
  Description?: string;
  AccountPassword?: string;
  Enabled?: boolean;
  Path?: string;
}

export async function createUser(input: CreateUserInput): Promise<ADUser> {
  const params: string[] = [
    `-Name '${sanitizeForPS(input.Name)}'`,
    `-SamAccountName '${sanitizeForPS(input.SamAccountName, "samAccountName")}'`,
  ];

  if (input.GivenName) params.push(`-GivenName '${sanitizeForPS(input.GivenName)}'`);
  if (input.Surname) params.push(`-Surname '${sanitizeForPS(input.Surname)}'`);
  if (input.UserPrincipalName) params.push(`-UserPrincipalName '${sanitizeForPS(input.UserPrincipalName)}'`);
  if (input.EmailAddress) params.push(`-EmailAddress '${sanitizeForPS(input.EmailAddress)}'`);
  if (input.Title) params.push(`-Title '${sanitizeForPS(input.Title)}'`);
  if (input.Department) params.push(`-Department '${sanitizeForPS(input.Department)}'`);
  if (input.Description) params.push(`-Description '${sanitizeForPS(input.Description)}'`);
  if (input.Path) params.push(`-Path '${sanitizeForPS(input.Path, "dn")}'`);
  if (input.AccountPassword) {
    params.push(`-AccountPassword (ConvertTo-SecureString '${sanitizeForPS(input.AccountPassword)}' -AsPlainText -Force)`);
    params.push(`-ChangePasswordAtLogon $true`);
  }
  params.push(`-Enabled $${input.Enabled !== false ? "true" : "false"}`);
  params.push(`-PassThru`);

  const raw = await runPS<ADUser>(`
Import-Module ActiveDirectory -ErrorAction Stop
$user = New-ADUser ${params.join(" ")}
Get-ADUser -Identity '${sanitizeForPS(input.SamAccountName, "samAccountName")}' -Properties ${USER_PROPS} | Select-Object ${USER_PROPS} | ${toJson(5)}
`);
  return raw;
}

export interface UpdateUserInput {
  DisplayName?: string;
  GivenName?: string;
  Surname?: string;
  EmailAddress?: string;
  Title?: string;
  Department?: string;
  Company?: string;
  Description?: string;
  OfficePhone?: string;
  MobilePhone?: string;
  Enabled?: boolean;
}

export async function updateUser(samAccountName: string, input: UpdateUserInput): Promise<ADUser> {
  const safeId = sanitizeForPS(samAccountName, "samAccountName");
  const params: string[] = [];

  if (input.DisplayName !== undefined) params.push(`-DisplayName '${sanitizeForPS(input.DisplayName)}'`);
  if (input.GivenName !== undefined) params.push(`-GivenName '${sanitizeForPS(input.GivenName)}'`);
  if (input.Surname !== undefined) params.push(`-Surname '${sanitizeForPS(input.Surname)}'`);
  if (input.EmailAddress !== undefined) params.push(`-EmailAddress '${sanitizeForPS(input.EmailAddress)}'`);
  if (input.Title !== undefined) params.push(`-Title '${sanitizeForPS(input.Title)}'`);
  if (input.Department !== undefined) params.push(`-Department '${sanitizeForPS(input.Department)}'`);
  if (input.Company !== undefined) params.push(`-Company '${sanitizeForPS(input.Company)}'`);
  if (input.Description !== undefined) params.push(`-Description '${sanitizeForPS(input.Description)}'`);
  if (input.OfficePhone !== undefined) params.push(`-OfficePhone '${sanitizeForPS(input.OfficePhone)}'`);
  if (input.MobilePhone !== undefined) params.push(`-MobilePhone '${sanitizeForPS(input.MobilePhone)}'`);

  let script = `
Import-Module ActiveDirectory -ErrorAction Stop
`;

  if (params.length > 0) {
    script += `Set-ADUser -Identity '${safeId}' ${params.join(" ")}\n`;
  }
  if (input.Enabled !== undefined) {
    if (input.Enabled) {
      script += `Enable-ADAccount -Identity '${safeId}'\n`;
    } else {
      script += `Disable-ADAccount -Identity '${safeId}'\n`;
    }
  }

  script += `Get-ADUser -Identity '${safeId}' -Properties ${USER_PROPS} | Select-Object ${USER_PROPS} | ${toJson(5)}`;

  return await runPS<ADUser>(script);
}

export async function deleteUser(samAccountName: string): Promise<void> {
  const safeId = sanitizeForPS(samAccountName, "samAccountName");
  await runPS(`
Import-Module ActiveDirectory -ErrorAction Stop
Remove-ADUser -Identity '${safeId}' -Confirm:$false
Write-Output 'null'
`);
}

export async function searchUsers(query: string): Promise<ADSearchResult[]> {
  const safe = sanitizeForPS(query);
  const raw = await runPS<Pick<ADUser, "Name" | "SamAccountName" | "DistinguishedName" | "Enabled">[]>(`
Import-Module ActiveDirectory -ErrorAction Stop
Get-ADUser -Filter {(SamAccountName -like '*${safe}*') -or (DisplayName -like '*${safe}*') -or (Name -like '*${safe}*')} -Properties SamAccountName,Name,DisplayName,DistinguishedName,Enabled |
  Select-Object Name,SamAccountName,DistinguishedName,Enabled |
  Select-Object -First 50 |
  ${toJson(3)}
`);

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.map((u) => ({
    type: "user" as const,
    name: u.Name,
    samAccountName: u.SamAccountName,
    distinguishedName: u.DistinguishedName,
    enabled: u.Enabled,
  }));
}
