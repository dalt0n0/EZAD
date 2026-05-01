import { NextResponse } from "next/server";
import { approveCert } from "@/lib/adcs/certificates";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await approveCert(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve certificate" },
      { status: 500 }
    );
  }
}
