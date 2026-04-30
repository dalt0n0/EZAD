export interface ADDomain {
  Name: string;
  DNSRoot: string;
  NetBIOSName: string;
  DomainMode: string;
  Forest: string;
  PDCEmulator: string;
  RIDMaster: string;
  InfrastructureMaster: string;
  DistinguishedName: string;
}

export interface ADOU {
  Name: string;
  DistinguishedName: string;
  Description?: string;
  CanonicalName?: string;
  children?: ADOU[];
}

export interface ADUser {
  SamAccountName: string;
  DistinguishedName: string;
  Name: string;
  DisplayName?: string;
  GivenName?: string;
  Surname?: string;
  UserPrincipalName?: string;
  EmailAddress?: string;
  Title?: string;
  Department?: string;
  Company?: string;
  Office?: string;
  OfficePhone?: string;
  MobilePhone?: string;
  Description?: string;
  Enabled: boolean;
  LockedOut?: boolean;
  PasswordExpired?: boolean;
  PasswordNeverExpires?: boolean;
  LastLogonDate?: string;
  Created?: string;
  Modified?: string;
  MemberOf?: string[];
  ObjectGUID?: string;
  CanonicalName?: string;
  Manager?: string;
  StreetAddress?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
}

export interface ADComputer {
  Name: string;
  SamAccountName: string;
  DistinguishedName: string;
  DNSHostName?: string;
  Enabled: boolean;
  OperatingSystem?: string;
  OperatingSystemVersion?: string;
  LastLogonDate?: string;
  Created?: string;
  Modified?: string;
  IPv4Address?: string;
  Description?: string;
  MemberOf?: string[];
  ObjectGUID?: string;
  CanonicalName?: string;
}

export interface ADGroup {
  Name: string;
  SamAccountName: string;
  DistinguishedName: string;
  GroupCategory: "Security" | "Distribution";
  GroupScope: "DomainLocal" | "Global" | "Universal";
  Description?: string;
  Created?: string;
  Modified?: string;
  MemberOf?: string[];
  Members?: string[];
  ObjectGUID?: string;
  CanonicalName?: string;
  ManagedBy?: string;
}

export interface ADGroupMember {
  Name: string;
  SamAccountName: string;
  DistinguishedName: string;
  ObjectClass: "user" | "computer" | "group";
  Enabled?: boolean;
}

export interface ADStats {
  userCount: number;
  computerCount: number;
  groupCount: number;
  ouCount: number;
  enabledUsers: number;
  disabledUsers: number;
  domain: ADDomain;
}

export type ADObjectType = "user" | "computer" | "group" | "ou";

export interface ADSearchResult {
  type: ADObjectType;
  name: string;
  samAccountName?: string;
  distinguishedName: string;
  enabled?: boolean;
}
