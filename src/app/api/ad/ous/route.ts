import { NextResponse } from "next/server";
import { listOUs } from "@/lib/ad/ous";

export async function GET() {
  try {
    const data = await listOUs();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch OUs" },
      { status: 500 }
    );
  }
}
