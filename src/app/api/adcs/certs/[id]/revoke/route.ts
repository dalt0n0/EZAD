import { NextResponse } from "next/server";
import { revokeCert } from "@/lib/adcs/certificates";
import { z } from "zod";

const RevokeSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { reason } = RevokeSchema.parse(body);
    await revokeCert(id, reason ?? "Unspecified");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke certificate" },
      { status: 500 }
    );
  }
}
