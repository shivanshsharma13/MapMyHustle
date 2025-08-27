import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { authorizeUrl } from "@/lib/strava";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const url = authorizeUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  return res;
}
