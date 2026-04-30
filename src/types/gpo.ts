export interface GPO {
  DisplayName: string;
  Id: string;
  DomainName: string;
  Owner?: string;
  GpoStatus: "AllSettingsEnabled" | "UserSettingsDisabled" | "ComputerSettingsDisabled" | "AllSettingsDisabled";
  Description?: string;
  CreationTime?: string;
  ModificationTime?: string;
  UserVersion?: { Template: number; AD: number };
  ComputerVersion?: { Template: number; AD: number };
  WmiFilter?: string;
}

export interface GPOLink {
  Target: string;
  DisplayName: string;
  Enabled: boolean;
  Enforced: boolean;
  Order: number;
  GPOId: string;
}

export interface GPOInheritance {
  Path: string;
  GpoLinks: GPOLink[];
  InheritedGpoLinks: GPOLink[];
  BlockInheritance: boolean;
}

export interface GPOSetting {
  category: "Computer Configuration" | "User Configuration";
  section: string;
  name: string;
  state?: string;
  value?: string;
  dropPath: string;
}

export interface GPOReport {
  gpo: GPO;
  links: GPOLink[];
  settings: GPOSetting[];
  rawXml?: string;
}

export interface RSoPGPO {
  Name: string;
  Id: string;
  LinkLocation: string;
  Precedence: number;
  Enabled: boolean;
  Enforced: boolean;
  AccessDenied: boolean;
  FilterAllowed: boolean;
  Reason?: string;
}

export interface RSoPResult {
  user: string;
  computer?: string;
  appliedGPOs: RSoPGPO[];
  deniedGPOs: RSoPGPO[];
  generatedAt: string;
}
