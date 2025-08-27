import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const jar = cookies();
  const token = jar.get("strava_t")?.value;
  const authorized = !!token;
  return NextResponse.json({ authorized });
}
