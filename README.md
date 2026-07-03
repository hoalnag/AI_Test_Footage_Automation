# AI Test Footage Automation

Drop a video into `incoming/` → it's uploaded to Vimeo, captioned, and published
to a JSON feed that your Cargo.com page renders as an embedded gallery. Clicking
a caption opens a page showing the AI prompt used to generate that video.

## One-time setup

### 1. Vimeo API access token

Programmatic uploads require a Vimeo **Plus/Pro/Business** account (the free
plan can't upload via the API).

1. Go to https://developer.vimeo.com/apps and click **Create App**.
2. Once created, open the app, go to **Authentication** → **Generate an Access Token**.
3. Choose **Personal use**, and select these scopes: `public`, `private`, `edit`, `upload`, `interact`.
4. Copy the generated access token.

### 2. Configure this project

```
cp .env.example .env
```

Paste the access token into `VIMEO_ACCESS_TOKEN` in `.env`. (Client ID/secret
aren't needed for a personal access token, but the fields are there if you
switch to OAuth later.)

```
npm install
```

### 3. Publish this repo with GitHub Pages

1. Create a new **public** GitHub repo and push this project to it:
   ```
   git remote add origin https://github.com/YOUR-USERNAME/AI_Test_Footage_Automation.git
   git branch -M main
   git add -A
   git commit -m "Initial setup"
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main`, folder: `/docs` → Save.
3. GitHub will give you a URL like `https://YOUR-USERNAME.github.io/AI_Test_Footage_Automation`.
   Put that in `SITE_BASE_URL` in `.env`.

### 4. Wire up the Cargo page

1. In the Cargo editor, add a **Custom Code** element to your test footage page.
2. Open [`docs/cargo-embed-snippet.html`](docs/cargo-embed-snippet.html), replace
   `SITE_BASE_URL` at the top with your GitHub Pages URL from step 3, and paste
   the whole snippet into the Cargo custom code block.
3. Publish the Cargo page. You only need to do this once — new videos appear
   automatically after that.

## Day-to-day use

```
npm run watch
```

Leave this running, then drop a video file (`.mp4`, `.mov`, `.m4v`, `.webm`)
into `incoming/`. You'll be prompted in the terminal for:

- **Caption** — the short label shown under the video on your site.
- **Prompt** — the AI prompt used to generate the video (shown on the detail page).

The script then:

1. Uploads the video to Vimeo.
2. Waits for Vimeo to finish transcoding.
3. Adds an entry to `docs/videos.json` and generates `docs/prompts/<slug>.html`.
4. Moves the source file from `incoming/` to `uploaded/` (kept locally as a backup, not uploaded to git).
5. Commits and pushes `docs/` to GitHub, which republishes the Pages site — your
   Cargo page picks up the new video on next page load.

To preview the gallery locally before it's live, run a static server against
`docs/` (e.g. `npx serve docs`) and open `index.html`.

## Notes

- If `git push` fails (e.g. no remote configured yet, or you need to authenticate),
  the script will tell you and leave the commit in place — just push manually.
- Vimeo transcoding can take a minute or two for longer clips; the script waits
  up to ~100 seconds before moving on. If it's still processing, the Vimeo player
  embed will simply show a brief loading state until it's ready.
