// Netlify serverless proxy for the World Cup 2026 auto-updating match map.
// It keeps the browser from depending on ESPN CORS headers.

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=950&dates=20260628-20260719";

exports.handler = async function handler() {
  try {
    const response = await fetch(SCOREBOARD_URL, {
      headers: {
        "accept": "application/json",
        "user-agent": "world-cup-2026-match-map/1.0"
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders("no-store"),
        body: JSON.stringify({ error: `ESPN scoreboard returned HTTP ${response.status}` })
      };
    }

    const payload = await response.json();
    return {
      statusCode: 200,
      headers: corsHeaders("public, max-age=45, s-maxage=45"),
      body: JSON.stringify({
        sourceType: "espnScoreboard",
        source: "ESPN public soccer scoreboard",
        sourceUrl: SCOREBOARD_URL,
        fetchedAt: new Date().toISOString(),
        payload
      })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: corsHeaders("no-store"),
      body: JSON.stringify({ error: error.message || "Unable to fetch live World Cup data" })
    };
  }
};

function corsHeaders(cacheControl) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl
  };
}
