export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/strava";

export async function GET() {
  // Works in both Edge and Node
  const state = crypto.randomUUID(); // uses Web Crypto
  const url = authorizeUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  return res;
}
