import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Temporary diagnostic route — remove once the emailRedirectTo/origin investigation is resolved.
export async function GET() {
  const h = await headers();
  return NextResponse.json({
    host: h.get("host"),
    "x-forwarded-host": h.get("x-forwarded-host"),
    "x-forwarded-proto": h.get("x-forwarded-proto"),
    origin: h.get("origin"),
  });
}
