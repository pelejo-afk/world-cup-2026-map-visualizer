// Netlify serverless proxy for the World Cup 2026 auto-updating match map.
// This avoids browser CORS issues and tries several ESPN scoreboard URL formats.

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders("no-store"), body: "" };
  }

  const now = new Date();
  const todayUtc = yyyymmdd(now);
  const yesterdayUtc = yyyymmdd(addDays(now, -1));
  const tomorrowUtc = yyyymmdd(addDays(now, 1));

  // ESPN's public API is undocumented. Some deployments/dates accept a full range;
  // others behave better with single-day or default scoreboard requests.
  const urls = [
    `${ESPN_BASE}?limit=1000&dates=20260628-20260719`,
    `${ESPN_BASE}?limit=1000&dates=${yesterdayUtc}`,
    `${ESPN_BASE}?limit=1000&dates=${todayUtc}`,
    `${ESPN_BASE}?limit=1000&dates=${tomorrowUtc}`,
    `${ESPN_BASE}?limit=1000`
  ];

  const attempts = [];
  const eventMap = new Map();
  let firstUsefulPayload = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "accept": "application/json,text/plain,*/*",
          "user-agent": "Mozilla/5.0 Netlify-WorldCup-Map/2.0",
          "referer": "https://www.espn.com/soccer/scoreboard/_/league/fifa.world"
        }
      });

      const text = await response.text();
      const attempt = { url, status: response.status, ok: response.ok, bytes: text.length };

      if (!response.ok) {
        attempt.error = `HTTP ${response.status}`;
        attempts.push(attempt);
        continue;
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch (jsonError) {
        attempt.error = "Response was not JSON";
        attempt.sample = text.slice(0, 120);
        attempts.push(attempt);
        continue;
      }

      const events = Array.isArray(payload.events) ? payload.events : [];
      attempt.events = events.length;
      attempts.push(attempt);

      if (events.length && !firstUsefulPayload) firstUsefulPayload = payload;
      for (const ev of events) {
        if (ev && ev.id) eventMap.set(String(ev.id), ev);
      }
    } catch (error) {
      attempts.push({ url, ok: false, error: error.message || String(error) });
    }
  }

  const events = Array.from(eventMap.values());
  if (!events.length) {
    return {
      statusCode: 502,
      headers: corsHeaders("no-store"),
      body: JSON.stringify({
        error: "Unable to fetch recognizable ESPN World Cup scoreboard events",
        attempts,
        hint: "Open this URL directly in the browser. If you see this JSON, the function deployed but ESPN did not return match events. If you see Page not found, the Netlify function was not deployed."
      }, null, 2)
    };
  }

  const payload = {
    ...(firstUsefulPayload || {}),
    events
  };

  return {
    statusCode: 200,
    headers: corsHeaders("public, max-age=45, s-maxage=45"),
    body: JSON.stringify({
      sourceType: "espnScoreboard",
      source: "ESPN public soccer scoreboard via Netlify function",
      sourceUrl: ESPN_BASE,
      fetchedAt: new Date().toISOString(),
      eventCount: events.length,
      attempts,
      payload
    })
  };
};

function corsHeaders(cacheControl) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl
  };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function yyyymmdd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
