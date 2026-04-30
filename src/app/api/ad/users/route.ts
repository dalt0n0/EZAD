import { NextResponse } from "next/server";
import { listUsers, createUser } from "@/lib/ad/users";
import { z } from "zod";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ou = searchParams.get("ou") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const data = await listUsers(ou, search);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}

const CreateUserSchema = z.object({
  Name: z.string().min(1),
  SamAccountName: z.string().min(1).max(20).regex(/^[a-zA-Z0-9._\-$ ]+$/),
  GivenName: z.string().optional(),
  Surname: z.string().optional(),
  UserPrincipalName: z.string().email().optional().or(z.literal("")),
  EmailAddress: z.string().email().optional().or(z.literal("")),
  Title: z.string().optional(),
  Department: z.string().optional(),
  Description: z.string().optional(),
  AccountPassword: z.string().min(8).optional(),
  Enabled: z.boolean().optional(),
  Path: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = CreateUserSchema.parse(body);
    const user = await createUser(input);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
