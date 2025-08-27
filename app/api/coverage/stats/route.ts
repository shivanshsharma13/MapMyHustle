export const runtime = "nodejs";
import { NextResponse } from "next/server";
import * as h3 from "h3-js";
import * as polyline from "@mapbox/polyline";

type Activity = {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  type: string;
  sport_type?: string;
  map?: { summary_polyline?: string | null };
  start_date?: string;
};

export async function POST(req: Request) {
  const body = await req.json();
  const activities: Activity[] = body.activities || [];
  const reso: number = body.hexResolution ?? 9;

  let totalDistance = 0;
  let totalMovingTime = 0;
  let runs = 0, rides = 0;

  const set = new Set<string>();

  for (const a of activities) {
    totalDistance += a.distance || 0;
    totalMovingTime += a.moving_time || 0;
    const t = a.sport_type || a.type;
    if (t === "Run") runs += 1;
    if (t === "Ride") rides += 1;

    const sum = a.map?.summary_polyline;
    if (!sum) continue;
    try {
      const pts = polyline.decode(sum) as [number, number][];
      for (const [lat, lng] of pts) {
        set.add(h3.geoToH3(lat, lng, reso));
      }
    } catch {}
  }

  const uniqueHexes = set.size;
  // Average hex area at a given resolution:
  const avg = h3.hexArea(reso, "km2") as number;
  const approxAreaKm2 = uniqueHexes * avg;

  return NextResponse.json({
    totalActivities: activities.length,
    totalRuns: runs,
    totalRides: rides,
    totalDistanceKm: totalDistance / 1000,
    totalMovingTimeH: totalMovingTime / 3600,
    hexResolution: reso,
    uniqueHexes,
    approxAreaKm2,
  });
}
