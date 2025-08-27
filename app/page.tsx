"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

type Activity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  type: string;
  sport_type?: string;
  map?: { summary_polyline?: string | null };
  start_date?: string;
};

type CoverageStats = {
  totalActivities: number;
  totalRuns: number;
  totalRides: number;
  totalDistanceKm: number;
  totalMovingTimeH: number;
  hexResolution: number;
  uniqueHexes: number;
  approxAreaKm2: number;
} | null;

const MapClient = dynamic(() => import("@/components/MapClient"), { ssr: false });

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<CoverageStats>(null);
  const [hexRes, setHexRes] = useState(9);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/strava/session", { cache: "no-store" });
      const j = await res.json();
      setAuthorized(j.authorized === true);
    })();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strava/activities?types=Run,Ride`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setActivities(data.activities);
    } catch (e: any) {
      alert(e.message || "Failed to fetch activities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) fetchActivities();
  }, [authorized]);

  useEffect(() => {
    if (!activities.length) { setStats(null); return; }
    (async () => {
      const res = await fetch("/api/coverage/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities, hexResolution: hexRes }),
      });
      const j = await res.json();
      setStats(j);
    })();
  }, [activities, hexRes]);

  const login = () => { window.location.href = "/api/strava/login"; };
  const logout = async () => { await fetch("/api/strava/logout", { method: "POST" }); window.location.reload(); };

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Strava Territories Map</h1>
          <div className="flex items-center gap-2">
            {authorized ? (
              <button className="btn" onClick={logout}>Logout</button>
            ) : (
              <button className="btn" onClick={login}>Connect Strava</button>
            )}
          </div>
        </header>

        {!authorized && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-2">Connect to start</h2>
            <p className="text-neutral-300 mb-4">
              Connect your Strava account to fetch your runs and rides, draw your coverage hexes,
              and see how much area you’ve conquered.
            </p>
            <button className="btn" onClick={login}>Connect Strava</button>
          </div>
        )}

        {authorized && (
          <>
            <div className="card p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <span className="text-sm text-neutral-400">Hex resolution</span>
                <input
                  type="range"
                  min={6}
                  max={11}
                  value={hexRes}
                  onChange={(e) => setHexRes(parseInt(e.target.value, 10))}
                />
                <span className="text-sm">{hexRes}</span>
                <button className="btn ml-auto" onClick={fetchActivities} disabled={loading}>
                  {loading ? "Syncing…" : "Sync latest"}
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              {/* Pass stats for footer in export */}
              <MapClient activities={activities} hexResolution={hexRes}/>
            </div>

            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-2">Coverage Stats</h3>
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Total activities" value={stats.totalActivities.toLocaleString()} />
                  <Stat label="Runs" value={stats.totalRuns.toLocaleString()} />
                  <Stat label="Rides" value={stats.totalRides.toLocaleString()} />
                  <Stat label="Distance (km)" value={stats.totalDistanceKm.toFixed(1)} />
                  <Stat label="Moving time (h)" value={stats.totalMovingTimeH.toFixed(1)} />
                  <Stat label="Hex resolution" value={String(stats.hexResolution)} />
                  <Stat label="Unique hexes" value={stats.uniqueHexes.toLocaleString()} />
                  <Stat label="Approx area (km²)" value={stats.approxAreaKm2.toFixed(2)} />
                </div>
              ) : (
                <p className="text-neutral-400">No stats yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
      <div className="text-neutral-400 text-xs">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
