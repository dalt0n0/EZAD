import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function getDNParts(dn: string): { type: string; value: string }[] {
  return dn.split(",").map((part) => {
    const [type, ...valueParts] = part.split("=");
    return { type: type.trim(), value: valueParts.join("=").trim() };
  });
}

export function getOUFromDN(dn: string): string {
  const parts = getDNParts(dn);
  const ou = parts.find((p) => p.type === "OU");
  return ou?.value ?? "Default";
}
