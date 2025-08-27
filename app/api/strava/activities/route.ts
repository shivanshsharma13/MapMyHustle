export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STRAVA_API_BASE, refreshAccessToken, type TokenBundle } from "@/lib/strava";

async function getBundle(): Promise<TokenBundle | null> {
  const jar = cookies();
  const raw = jar.get("strava_t")?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function withFreshToken(bundle: TokenBundle): Promise<TokenBundle> {
  const now = Math.floor(Date.now() / 1000);
  if (bundle.expires_at <= now + 60) {
    // refresh
    const fresh = await refreshAccessToken(bundle);
    // update cookie
    const res = NextResponse.next();
    res.cookies.set("strava_t", JSON.stringify(fresh), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60*60*24*30
    });
    // But we cannot return this response from here, so just return fresh;
    return fresh;
  }
  return bundle;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const types = (url.searchParams.get("types") || "").split(",").map(s => s.trim()).filter(Boolean);

  const jar = cookies();
  const raw = jar.get("strava_t")?.value;
  if (!raw) return NextResponse.json({ error: "not_authorized" }, { status: 401 });
  let bundle: any;
  try { bundle = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_cookie" }, { status: 400 }); }

  // refresh if needed
  const now = Math.floor(Date.now() / 1000);
  if (bundle.expires_at <= now + 60) {
    try {
      bundle = await refreshAccessToken(bundle);
    } catch (e) {
      return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
    }
    // set cookie
    const res = NextResponse.next();
    res.cookies.set("strava_t", JSON.stringify(bundle), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60*60*24*30
    });
  }

  async function fetchPage(page: number) {
    const q = new URLSearchParams({ per_page: "200", page: String(page) });
    const r = await fetch(`${STRAVA_API_BASE}/athlete/activities?${q.toString()}`, {
      headers: { Authorization: `Bearer ${bundle.access_token}` }
    });
    if (!r.ok) throw new Error(`strava ${r.status}`);
    return r.json();
  }

  let page = 1;
  const all: any[] = [];
  const MAX_PAGES = 20; // up to 4000 activities
  try {
    while (page <= MAX_PAGES) {
      const arr = await fetchPage(page);
      if (!Array.isArray(arr) || arr.length === 0) break;
      all.push(...arr);
      page += 1;
    }
  } catch (e) {
    return NextResponse.json({ error: "strava_fetch_failed", message: String(e) }, { status: 502 });
  }

  // filter & project
  const wanted = all.filter((a) => {
    const t = (a.sport_type || a.type);
    if (!types.length) return true;
    return types.includes(t);
  }).map((a) => ({
    id: a.id,
    name: a.name,
    distance: a.distance,
    moving_time: a.moving_time,
    type: a.type,
    sport_type: a.sport_type,
    map: { summary_polyline: a.map?.summary_polyline || null },
    start_date: a.start_date,
  }));

  return NextResponse.json({ activities: wanted });
}
