import { NextResponse } from "next/server";
import { listIssuedCerts, listPendingCerts, listRevokedCerts } from "@/lib/adcs/certificates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "issued";

  try {
    if (status === "pending") {
      return NextResponse.json(await listPendingCerts());
    } else if (status === "revoked") {
      return NextResponse.json(await listRevokedCerts());
    } else {
      return NextResponse.json(await listIssuedCerts());
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}
