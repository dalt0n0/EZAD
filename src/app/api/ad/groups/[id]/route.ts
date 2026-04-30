import { NextResponse } from "next/server";
import { getGroup, getGroupMembers, addGroupMember, removeGroupMember } from "@/lib/ad/groups";
import { z } from "zod";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const members = searchParams.get("members") === "true";

  try {
    if (members) {
      const data = await getGroupMembers(id);
      return NextResponse.json(data);
    }
    const group = await getGroup(id);
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Group not found" },
      { status: 404 }
    );
  }
}

const MembershipSchema = z.object({
  action: z.enum(["add", "remove"]),
  memberSam: z.string().min(1),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { action, memberSam } = MembershipSchema.parse(body);
    if (action === "add") {
      await addGroupMember(id, memberSam);
    } else {
      await removeGroupMember(id, memberSam);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update group membership" },
      { status: 500 }
    );
  }
}
