export interface Certificate {
  RequestId: number;
  SerialNumber: string;
  CommonName: string;
  Template: string;
  NotBefore: string;
  NotAfter: string;
  IssuedTo: string;
  Status: "Issued" | "Pending" | "Revoked" | "Failed";
  RevokedReason?: string;
  RevokedDate?: string;
  RawCertBase64?: string;
}

export interface CertTemplate {
  Name: string;
  DisplayName: string;
  OID: string;
}
