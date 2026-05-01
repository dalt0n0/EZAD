import { NextResponse } from "next/server";
import { getGPO, getGPOReport, updateGPO, deleteGPO } from "@/lib/gpo/gpo";
import { z } from "zod";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report") === "true";

  try {
    if (report) {
      const data = await getGPOReport(id);
      return NextResponse.json(data);
    }
    const data = await getGPO(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GPO not found" },
      { status: 404 }
    );
  }
}

const UpdateGPOSchema = z.object({
  GpoStatus: z.enum(["AllSettingsEnabled", "UserSettingsDisabled", "ComputerSettingsDisabled", "AllSettingsDisabled"]).optional(),
  Description: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const input = UpdateGPOSchema.parse(body);
    const gpo = await updateGPO(id, input);
    return NextResponse.json(gpo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update GPO" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteGPO(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete GPO" },
      { status: 500 }
    );
  }
}
