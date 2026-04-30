import { NextResponse } from "next/server";
import { getGPO, getGPOReport } from "@/lib/gpo/gpo";

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
