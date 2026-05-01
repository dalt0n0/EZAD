import { NextResponse } from "next/server";
import { listGPOs, createGPO } from "@/lib/gpo/gpo";
import { z } from "zod";

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

const CreateGPOSchema = z.object({
  Name: z.string().min(1).max(255),
  Comment: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { Name, Comment } = CreateGPOSchema.parse(body);
    const gpo = await createGPO(Name, Comment);
    return NextResponse.json(gpo, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create GPO" },
      { status: 500 }
    );
  }
}
