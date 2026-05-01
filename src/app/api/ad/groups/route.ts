import { NextResponse } from "next/server";
import { listGroups, createGroup } from "@/lib/ad/groups";
import { z } from "zod";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const ou = searchParams.get("ou") ?? undefined;

  try {
    const data = await listGroups(search, ou);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

const CreateGroupSchema = z.object({
  Name: z.string().min(1),
  SamAccountName: z.string().min(1).max(256).regex(/^[a-zA-Z0-9._\-$ ]+$/),
  GroupScope: z.enum(["DomainLocal", "Global", "Universal"]),
  GroupCategory: z.enum(["Security", "Distribution"]),
  Description: z.string().optional(),
  Path: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = CreateGroupSchema.parse(body);
    const group = await createGroup(input);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create group" },
      { status: 500 }
    );
  }
}
