import { NextResponse } from "next/server";
import { listComputers } from "@/lib/ad/computers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ou = searchParams.get("ou") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const data = await listComputers(ou, search);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch computers" },
      { status: 500 }
    );
  }
}
