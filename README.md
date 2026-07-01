# World Cup 2026 Live Match Map

This is a free, Netlify-ready version of the interactive World Cup 2026 match map.

## What it does

- Shows the World Cup 2026 knockout matches on a global map.
- Groups clickable match links by round.
- Auto-refreshes live scores/results about every 60 seconds while the page is open.
- Highlights both countries for the selected match.
- Shows fireworks over the winner when a winner is known.
- Falls back to the embedded schedule snapshot if the live feed is unavailable.

## How the live update works

The browser calls `/api/worldcup`, which Netlify redirects to `/.netlify/functions/worldcup`.
The Netlify function fetches ESPN's public FIFA World Cup scoreboard JSON and returns it to the page.

ESPN's public scoreboard endpoint is undocumented, so it can change. The page has fallback data so it will still display even if the feed fails.

## Free deployment path

1. Create a free GitHub repository.
2. Upload all files and folders in this package. Keep `index.html`, `netlify.toml`, `package.json`, and the `netlify/functions/worldcup.js` path exactly as-is.
3. Create a free Netlify account.
4. In Netlify, choose **Add new site → Import an existing project**.
5. Connect the GitHub repo.
6. Use the default build settings. No build command is needed. Publish directory should be `.`.
7. Deploy.

## Local testing

If you have Node.js and the Netlify CLI installed:

```bash
npm install -g netlify-cli
netlify dev
```

Then open the local Netlify URL shown in your terminal.
