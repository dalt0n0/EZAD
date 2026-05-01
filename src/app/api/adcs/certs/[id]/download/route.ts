import { NextResponse } from "next/server";
import { getCertPem } from "@/lib/adcs/certificates";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const pem = await getCertPem(Number(id));
    if (!pem) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }
    return new NextResponse(pem, {
      headers: {
        "Content-Type": "application/x-pem-file",
        "Content-Disposition": `attachment; filename="cert-${id}.pem"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download certificate" },
      { status: 500 }
    );
  }
}
