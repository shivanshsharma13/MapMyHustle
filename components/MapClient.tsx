"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as polyline from "@mapbox/polyline";
import * as h3 from "h3-js";
import * as htmlToImage from "html-to-image";

// React-Leaflet dynamic imports (no SSR)
const RL = {
  MapContainer: dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false }),
  TileLayer: dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false }),
  Polyline: dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false }),
  Polygon: dynamic(() => import("react-leaflet").then(m => m.Polygon), { ssr: false }),
};

type Activity = {
  id: number;
  name: string;
  distance: number;        // meters
  moving_time: number;     // seconds
  type: string;
  sport_type?: string;
  map?: { summary_polyline?: string | null };
  start_date?: string;     // ISO
};

// Local bounds type to avoid needing @types/leaflet
type BoundsExpr = [[number, number], [number, number]];

function getType(a: Activity) {
  return a.sport_type || a.type;
}

function decode(a?: Activity) {
  const sum = a?.map?.summary_polyline;
  if (!sum) return [] as [number, number][];
  return polyline.decode(sum).map(([lat, lng]) => [lat, lng] as [number, number]);
}

export default function MapClient({
  activities,
  hexResolution,
}: {
  activities: Activity[];
  hexResolution: number;
}) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<BoundsExpr | null>(null);

  // Render only after mount (prevents double init), and give a stable key
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [mapKey] = useState(() => `leaflet-map-${Math.random().toString(36).slice(2)}`);

  // Latest Run (for default view)
  const latestRun = useMemo(() => {
    const runs = activities
      .filter(a => getType(a) === "Run" && a.start_date)
      .sort((a, b) => (new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime()));
    return runs[0];
  }, [activities]);

  // Build lines + points
  const { runLines, rideLines, allPoints, lastRunPoints } = useMemo(() => {
    const runLines: number[][][] = [];
    const rideLines: number[][][] = [];
    const allPoints: [number, number][] = [];

    for (const a of activities) {
      const pts = decode(a);
      if (!pts.length) continue;

      const t = getType(a);
      if (t === "Run") runLines.push(pts);
      else if (t === "Ride") rideLines.push(pts);
      else rideLines.push(pts); // default to ride color if unknown

      allPoints.push(...pts);
    }

    const lastRunPoints = latestRun ? decode(latestRun) : ([] as [number, number][]);
    return { runLines, rideLines, allPoints, lastRunPoints };
  }, [activities, latestRun]);

  // Bounds: latest run > all points > India center; add padding to avoid zero-area
  useEffect(() => {
    const pick = (pts: [number, number][]): BoundsExpr | null => {
      if (!pts.length) return null;

      let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180;
      for (const [lat, lng] of pts) {
        if (lat < minLat) minLat = lat;
        if (lng < minLng) minLng = lng;
        if (lat > maxLat) maxLat = lat;
        if (lng > maxLng) maxLng = lng;
      }

      const pad = 0.0015; // ~150m-ish depending on latitude
      if (minLat === maxLat) { minLat -= pad; maxLat += pad; }
      if (minLng === maxLng) { minLng -= pad; maxLng += pad; }

      return [[minLat, minLng], [maxLat, maxLng]];
    };

    const b =
      lastRunPoints.length ? pick(lastRunPoints) :
      allPoints.length ? pick(allPoints) :
      null;

    setBounds(b ?? [[20.5937, 78.9629], [20.5937, 78.9629]]); // India center fallback
  }, [lastRunPoints, allPoints]);

  // Territory polygons (H3) from all points
  const hexPolygons = useMemo(() => {
    const set = new Set<string>();
    for (const pts of [...runLines, ...rideLines]) {
      for (const [lat, lng] of pts) {
        try { set.add(h3.geoToH3(lat, lng, hexResolution)); } catch {}
      }
    }
    const ids = Array.from(set).slice(0, 8000);
    return ids.map((h) => {
      const boundary = h3.h3ToGeoBoundary(h, true) as [number, number][];
      return boundary.map(([lat, lng]) => [lat, lng]) as [number, number][];
    });
  }, [runLines, rideLines, hexResolution]);

  // Export portrait PNG (map + legend only)
  const downloadPortrait = async () => {
    if (!exportRef.current) return;
    const node = exportRef.current;
    try {
      const dataUrl = await htmlToImage.toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        width: 1080,
        height: 1920,
        style: { width: "1080px", height: "1920px" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
      a.download = `mapmyhustle-portrait-${ts}.png`;
      a.click();
    } catch (e) {
      alert("Export failed. Try again after the map tiles finish loading.");
      console.error(e);
    }
  };

  return (
    <div className="relative w-full h-[70vh]">
      {/* Legend */}
      <div className="absolute z-[500] top-3 left-3 card px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-1 rounded bg-green-500"></span> Run
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-3 h-1 rounded bg-blue-500"></span> Ride
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 opacity-30"></span> Territory
        </div>
      </div>

      {/* Download button */}
      <div className="absolute z-[500] top-3 right-3 card px-3 py-2 text-xs flex items-center gap-2">
        <button className="btn" onClick={downloadPortrait}>Download Portrait PNG</button>
      </div>

      {/* Map export container */}
      <div ref={exportRef} className="w-full h-full relative">
        {mounted && bounds && (
          <RL.MapContainer
            key={mapKey}
            className="w-full h-full"
            bounds={bounds as any}
            scrollWheelZoom
          >
            <RL.TileLayer
              crossOrigin="anonymous"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Light territory fill */}
            {hexPolygons.map((poly, i) => (
              <RL.Polygon
                key={`hx-${i}`}
                positions={poly}
                pathOptions={{
                  weight: 1,
                  fillOpacity: 0.18,
                  opacity: 0.35,
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                }}
              />
            ))}

            {/* Runs: green */}
            {runLines.map((pts, i) => (
              <RL.Polyline
                key={`run-${i}`}
                positions={pts}
                weight={3}
                opacity={0.9}
                pathOptions={{ color: "#22c55e" }}
              />
            ))}

            {/* Rides: blue */}
            {rideLines.map((pts, i) => (
              <RL.Polyline
                key={`ride-${i}`}
                positions={pts}
                weight={3}
                opacity={0.9}
                pathOptions={{ color: "#3b82f6" }}
              />
            ))}
          </RL.MapContainer>
        )}
      </div>
    </div>
  );
}
