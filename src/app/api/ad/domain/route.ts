import { NextResponse } from "next/server";
import { getDomain, getStats } from "@/lib/ad/domain";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stats = searchParams.get("stats") === "true";

  try {
    if (stats) {
      const data = await getStats();
      return NextResponse.json(data);
    }
    const data = await getDomain();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch domain info" },
      { status: 500 }
    );
  }
}
