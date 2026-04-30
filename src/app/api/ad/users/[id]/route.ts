import { NextResponse } from "next/server";
import { getUser, updateUser, deleteUser } from "@/lib/ad/users";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUser(id);
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "User not found" },
      { status: 404 }
    );
  }
}

const UpdateUserSchema = z.object({
  DisplayName: z.string().optional(),
  GivenName: z.string().optional(),
  Surname: z.string().optional(),
  EmailAddress: z.string().email().optional().or(z.literal("")),
  Title: z.string().optional(),
  Department: z.string().optional(),
  Company: z.string().optional(),
  Description: z.string().optional(),
  OfficePhone: z.string().optional(),
  MobilePhone: z.string().optional(),
  Enabled: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const input = UpdateUserSchema.parse(body);
    const user = await updateUser(id, input);
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteUser(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
