# Strava Territories Map (Next.js + Leaflet + H3)

Fetch your **Strava runs & rides**, draw your **coverage hexes** (H3 grid) on a map,
and see **area covered** + other stats.

https://www.strava.com/settings/api → Create an application and set:
- **Callback Domain / Redirect URI**: `YOUR_BASE_URL/api/strava/callback`
  - On localhost: `http://localhost:3000/api/strava/callback`

## Quick Start

1. **Clone & Install**
   ```bash
   npm i
   ```

2. **Configure env**
   Copy `.env.example` to `.env.local` and fill:
   ```bash
   STRAVA_CLIENT_ID=12345
   STRAVA_CLIENT_SECRET=your_secret
   BASE_URL=http://localhost:3000
   ```

3. **Run**
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` → **Connect Strava** → map + stats.

## What it does

- OAuth login to Strava (stores a secure cookie with access + refresh tokens).
- Fetches up to 4000 recent activities (200 per page × 20 pages) and filters **Run** and **Ride**.
- Decodes polylines, draws activity polylines, and overlays unique **H3 hex cells** you've visited.
- Bottom panel shows total activities, runs/rides split, distance, moving time,
  **unique hexes**, and **approximate area in km²** (unique hexes × average hex area at that resolution).

## Notes

- If you get `invalid redirect_uri`, make sure Strava dashboard has exactly:
  `YOUR_BASE_URL/api/strava/callback`
- If you have thousands of activities, rendering every hex can be heavy. The UI caps drawing to ~6000 hexes.
  Use a **coarser hex resolution** (lower number) for broader, faster rendering.
- Tokens auto-refresh when expired.
- This app does not persist your data server-side; tokens are kept in an **httpOnly** cookie.

## Tech

- Next.js App Router (14+), TypeScript, Tailwind CSS
- Leaflet + React-Leaflet
- H3 grid (`h3-js`) for territory coverage
- `polyline` to decode Strava polylines
