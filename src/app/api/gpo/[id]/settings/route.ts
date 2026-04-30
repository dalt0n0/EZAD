import { NextResponse } from "next/server";
import { getGPOReport } from "@/lib/gpo/gpo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const report = await getGPOReport(id);
    return NextResponse.json(report.settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GPO settings" },
      { status: 500 }
    );
  }
}
