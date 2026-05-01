import { runPS, runPSRaw, sanitizeForPS, toJson } from "@/lib/powershell";
import type { Certificate, CertTemplate } from "@/types/adcs";

export async function listIssuedCerts(): Promise<Certificate[]> {
  const raw = await runPS<Certificate[]>(`
Import-Module PSPKI -ErrorAction Stop
$ca = Get-CertificationAuthority
$ca | Get-IssuedRequest -Property RequestID,SerialNumber,CommonName,CertificateTemplate,NotBefore,NotAfter,RequesterName |
  Select-Object @{N='RequestId';E={$_.RequestID}},
    @{N='SerialNumber';E={$_.SerialNumber}},
    @{N='CommonName';E={$_.CommonName}},
    @{N='Template';E={$_.CertificateTemplate}},
    @{N='NotBefore';E={$_.NotBefore}},
    @{N='NotAfter';E={$_.NotAfter}},
    @{N='IssuedTo';E={$_.RequesterName}},
    @{N='Status';E={'Issued'}} |
  ${toJson(3)}
`);
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr;
}

export async function listPendingCerts(): Promise<Certificate[]> {
  const raw = await runPS<Certificate[]>(`
Import-Module PSPKI -ErrorAction Stop
$ca = Get-CertificationAuthority
$ca | Get-PendingRequest -Property RequestID,CommonName,CertificateTemplate,RequestSubmittedWhen,RequesterName |
  Select-Object @{N='RequestId';E={$_.RequestID}},
    @{N='SerialNumber';E={''}},
    @{N='CommonName';E={$_.CommonName}},
    @{N='Template';E={$_.CertificateTemplate}},
    @{N='NotBefore';E={$_.RequestSubmittedWhen}},
    @{N='NotAfter';E={''}},
    @{N='IssuedTo';E={$_.RequesterName}},
    @{N='Status';E={'Pending'}} |
  ${toJson(3)}
`);
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr;
}

export async function listRevokedCerts(): Promise<Certificate[]> {
  const raw = await runPS<Certificate[]>(`
Import-Module PSPKI -ErrorAction Stop
$ca = Get-CertificationAuthority
$ca | Get-RevokedRequest -Property RequestID,SerialNumber,CommonName,CertificateTemplate,NotBefore,NotAfter,RequesterName,RevokedWhen,RevokedReason |
  Select-Object @{N='RequestId';E={$_.RequestID}},
    @{N='SerialNumber';E={$_.SerialNumber}},
    @{N='CommonName';E={$_.CommonName}},
    @{N='Template';E={$_.CertificateTemplate}},
    @{N='NotBefore';E={$_.NotBefore}},
    @{N='NotAfter';E={$_.NotAfter}},
    @{N='IssuedTo';E={$_.RequesterName}},
    @{N='Status';E={'Revoked'}},
    @{N='RevokedDate';E={$_.RevokedWhen}},
    @{N='RevokedReason';E={$_.RevokedReason}} |
  ${toJson(3)}
`);
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr;
}

export async function approveCert(requestId: number): Promise<void> {
  const safeId = sanitizeForPS(String(requestId), "samAccountName");
  await runPS(`
Import-Module PSPKI -ErrorAction Stop
$ca = Get-CertificationAuthority
$ca | Get-PendingRequest -RequestID ${safeId} | Approve-CertificateRequest
Write-Output 'null'
`);
}

export async function revokeCert(serial: string, reason = "Unspecified"): Promise<void> {
  const safeSerial = sanitizeForPS(serial);
  const safeReason = sanitizeForPS(reason);
  await runPS(`
Import-Module PSPKI -ErrorAction Stop
$ca = Get-CertificationAuthority
$ca | Revoke-Certificate -SerialNumber '${safeSerial}' -Reason '${safeReason}'
Write-Output 'null'
`);
}

export async function getCertPem(requestId: number): Promise<string> {
  const safeId = sanitizeForPS(String(requestId), "samAccountName");
  const pem = await runPSRaw(`
Import-Module PSPKI -ErrorAction Stop
$ca = Get-CertificationAuthority
$req = $ca | Get-IssuedRequest -RequestID ${safeId} -Property RawCertificate
if ($req -and $req.RawCertificate) {
  $b64 = [Convert]::ToBase64String($req.RawCertificate)
  $lines = @('-----BEGIN CERTIFICATE-----')
  for ($i = 0; $i -lt $b64.Length; $i += 64) {
    $lines += $b64.Substring($i, [Math]::Min(64, $b64.Length - $i))
  }
  $lines += '-----END CERTIFICATE-----'
  $lines -join "`n"
} else {
  Write-Output ''
}
`);
  return pem.trim();
}

export async function listTemplates(): Promise<CertTemplate[]> {
  const raw = await runPS<CertTemplate[]>(`
Import-Module PSPKI -ErrorAction Stop
Get-CertificateTemplate |
  Select-Object @{N='Name';E={$_.Name}},
    @{N='DisplayName';E={$_.DisplayName}},
    @{N='OID';E={$_.OID.Value}} |
  ${toJson(3)}
`);
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr;
}
