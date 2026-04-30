import { NextResponse } from "next/server";
import { getComputer } from "@/lib/ad/computers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const computer = await getComputer(id);
    return NextResponse.json(computer);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Computer not found" },
      { status: 404 }
    );
  }
}
