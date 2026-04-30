import { NextResponse } from "next/server";
import { listGPOs } from "@/lib/gpo/gpo";

export async function GET() {
  try {
    const data = await listGPOs();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GPOs" },
      { status: 500 }
    );
  }
}
