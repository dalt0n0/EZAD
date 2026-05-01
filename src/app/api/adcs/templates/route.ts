import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/adcs/certificates";

export async function GET() {
  try {
    const data = await listTemplates();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
