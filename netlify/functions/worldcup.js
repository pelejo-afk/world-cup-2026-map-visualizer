// Netlify serverless proxy for the World Cup 2026 auto-updating match map.
// V5: fetches every tournament date individually so completed prior-day results
// can fill the next-round matchups on the map.

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const TOURNAMENT_DATES = dateRange("2026-06-28", "2026-07-19");

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders("no-store"), body: "" };
  }

  // ESPN's public API is undocumented. The range URL sometimes omits older games,
  // so V5 also asks for every matchday one by one and combines the events.
  const urls = [
    `${ESPN_BASE}?limit=1000&dates=20260628-20260719`,
    `${ESPN_BASE}?limit=1000`,
    ...TOURNAMENT_DATES.map(d => `${ESPN_BASE}?limit=1000&dates=${d.replaceAll("-", "")}`)
  ];

  const settled = await Promise.allSettled(urls.map(fetchScoreboard));
  const attempts = [];
  const eventMap = new Map();
  let firstUsefulPayload = null;

  for (const item of settled) {
    const attempt = item.status === "fulfilled" ? item.value : { ok: false, error: item.reason?.message || String(item.reason) };
    attempts.push(attempt);
    if (attempt.payload?.events?.length && !firstUsefulPayload) firstUsefulPayload = attempt.payload;
    for (const ev of attempt.payload?.events || []) {
      if (ev && ev.id) eventMap.set(String(ev.id), ev);
      else if (ev) eventMap.set(`${ev.date || "no-date"}-${ev.name || Math.random()}`, ev);
    }
  }

  const events = Array.from(eventMap.values()).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  if (!events.length) {
    return {
      statusCode: 502,
      headers: corsHeaders("no-store"),
      body: JSON.stringify({
        ok: false,
        error: "Unable to fetch recognizable ESPN World Cup scoreboard events",
        attemptedUrlCount: urls.length,
        attempts,
        hint: "If this URL returns JSON, the function deployed. If it returns Page not found, netlify/functions/worldcup.js did not deploy."
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
      ok: true,
      sourceType: "espnScoreboard",
      source: "ESPN public soccer scoreboard via Netlify function",
      sourceUrl: ESPN_BASE,
      fetchedAt: new Date().toISOString(),
      tournamentDateCount: TOURNAMENT_DATES.length,
      attemptedUrlCount: urls.length,
      eventCount: events.length,
      attempts,
      payload
    })
  };
};

async function fetchScoreboard(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept": "application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0 Netlify-WorldCup-Map/5.0",
        "referer": "https://www.espn.com/soccer/scoreboard/_/league/fifa.world"
      }
    });

    const text = await response.text();
    const attempt = { url, status: response.status, ok: response.ok, bytes: text.length };
    if (!response.ok) {
      attempt.error = `HTTP ${response.status}`;
      return attempt;
    }

    try {
      const payload = JSON.parse(text);
      attempt.payload = payload;
      attempt.events = Array.isArray(payload.events) ? payload.events.length : 0;
      return attempt;
    } catch (jsonError) {
      attempt.error = "Response was not JSON";
      attempt.sample = text.slice(0, 140);
      return attempt;
    }
  } catch (error) {
    return { url, ok: false, error: error.name === "AbortError" ? "Request timed out" : (error.message || String(error)) };
  } finally {
    clearTimeout(timeout);
  }
}

function corsHeaders(cacheControl) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl
  };
}

function dateRange(start, end) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  const final = new Date(`${end}T00:00:00Z`);
  while (d <= final) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
