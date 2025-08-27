import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, getBaseUrl } from "@/lib/strava";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  const jar = cookies();
  const saved = jar.get("oauth_state")?.value;

  if (err) {
    return NextResponse.redirect(`${getBaseUrl()}/?error=${encodeURIComponent(err)}`);
  }
  if (!code || !state || !saved || saved !== state) {
    return NextResponse.redirect(`${getBaseUrl()}/?error=invalid_oauth_state`);
  }

  try {
    const bundle = await exchangeCodeForToken(code);
    const res = NextResponse.redirect(`${getBaseUrl()}/`);
    res.cookies.set("strava_t", JSON.stringify(bundle), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    res.cookies.delete("oauth_state");
    return res;
  } catch (e: any) {
    return NextResponse.redirect(`${getBaseUrl()}/?error=${encodeURIComponent(e.message || "token_error")}`);
  }
}
