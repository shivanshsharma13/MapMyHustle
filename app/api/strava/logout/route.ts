
export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("strava_t");
  res.cookies.delete("oauth_state");
  return res;
}
