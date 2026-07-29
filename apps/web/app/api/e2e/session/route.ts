import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}
