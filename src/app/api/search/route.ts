import { NextResponse } from "next/server";
import { searchUsers } from "@/lib/ad/users";
import { searchComputers } from "@/lib/ad/computers";
import { searchGroups } from "@/lib/ad/groups";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const [users, computers, groups] = await Promise.all([
      searchUsers(query).catch(() => []),
      searchComputers(query).catch(() => []),
      searchGroups(query).catch(() => []),
    ]);

    return NextResponse.json([...users, ...computers, ...groups]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
