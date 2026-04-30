import { NextResponse } from "next/server";
import { getRSoP } from "@/lib/gpo/rsop";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { searchParams } = new URL(request.url);
  const computer = searchParams.get("computer") ?? undefined;

  try {
    const data = await getRSoP(userId, computer);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get RSoP" },
      { status: 500 }
    );
  }
}
