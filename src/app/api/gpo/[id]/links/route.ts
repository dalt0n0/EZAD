import { NextResponse } from "next/server";
import { linkGPO, unlinkGPO } from "@/lib/gpo/gpo";
import { z } from "zod";

const LinkSchema = z.object({
  ouDN: z.string().min(1),
  enforced: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { ouDN, enforced } = LinkSchema.parse(body);
    await linkGPO(id, ouDN, enforced ?? false);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link GPO" },
      { status: 500 }
    );
  }
}

const UnlinkSchema = z.object({
  ouDN: z.string().min(1),
});

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { ouDN } = UnlinkSchema.parse(body);
    await unlinkGPO(id, ouDN);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unlink GPO" },
      { status: 500 }
    );
  }
}
