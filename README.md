# World Cup 2026 Live Match Map

This is a free, Netlify-ready version of the interactive World Cup 2026 match map.

## What it does

- Shows the World Cup 2026 knockout matches on a global map.
- Groups clickable match links by round.
- Auto-refreshes live scores/results about every 60 seconds while the page is open.
- Highlights both countries for the selected match.
- Shows fireworks over the winner when a winner is known.
- Falls back to the embedded schedule snapshot if the live feed is unavailable.

## Required hosting

Use Netlify for the live auto-update version. GitHub Pages by itself will show the map, but it will not run the serverless function needed at `/api/worldcup`.

## Files that must be in GitHub

Keep this exact structure:

```text
index.html
netlify.toml
package.json
README.md
netlify/functions/worldcup.js
```

Do not upload only the ZIP file. Extract the ZIP and upload the files/folders.

## Netlify build settings

- Branch: `main`
- Base directory: leave blank
- Build command: leave blank
- Publish directory: `.`

The included `netlify.toml` tells Netlify where the function lives.

## Testing the live feed

After deployment, open this URL, replacing the domain with your site:

```text
https://YOUR-SITE.netlify.app/api/worldcup
```

Expected result: JSON with `sourceType`, `eventCount`, `attempts`, and `payload.events`.

If you see `Page not found`, the Netlify function did not deploy. Check that `netlify/functions/worldcup.js` exists in GitHub and redeploy from Netlify.

If you see JSON with an `error` and `attempts`, the function deployed but ESPN did not return usable events at that moment. The page will keep showing the saved snapshot until the endpoint works again.

## How the live update works

The browser calls `/api/worldcup`, which Netlify redirects to `/.netlify/functions/worldcup`. The Netlify function fetches ESPN's public FIFA World Cup scoreboard JSON and returns it to the page. ESPN's endpoint is public/keyless but undocumented, so this v2 function tries multiple scoreboard URL formats and returns diagnostics if all fail.


## V3 fix notes

This version keeps using the Netlify Function at `/api/worldcup`, but the browser code now matches outside scoreboard events by team pair if the outside feed uses different match IDs. It also includes a root `_redirects` file in addition to `netlify.toml` so Netlify has an explicit `/api/worldcup` rewrite.

After deploying, test both of these URLs:

- `https://YOUR-SITE.netlify.app/api/worldcup`
- `https://YOUR-SITE.netlify.app/.netlify/functions/worldcup`

If either URL returns JSON, the function is deployed. If both return Page not found, the `netlify/functions/worldcup.js` file is missing, in the wrong folder, or the site was not redeployed from the updated GitHub repository.
