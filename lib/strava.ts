export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export function getBaseUrl(): string {
  // Prefer explicit BASE_URL (set for production)
  if (process.env.BASE_URL) return process.env.BASE_URL;
  // On Vercel previews/branches, this is auto-set like "project-abc.vercel.app"
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Local dev fallback
  return "http://localhost:3000";
}


export function getScopes(): string {
  // read-like scopes are enough to fetch activities
  return "read,activity:read";
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: `${getBaseUrl()}/api/strava/callback`,
    scope: getScopes(),
    state,
    approval_prompt: "auto"
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  athlete?: any;
};

export async function exchangeCodeForToken(code: string): Promise<TokenBundle> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete: data.athlete,
  };
}

export async function refreshAccessToken(bundle: TokenBundle): Promise<TokenBundle> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: bundle.refresh_token,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete: bundle.athlete,
  };
}
