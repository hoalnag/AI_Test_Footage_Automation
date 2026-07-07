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

Optional: if you want new uploads to land in a specific Vimeo folder, set
`VIMEO_FOLDER_URI` in `.env` (e.g. `/users/12345/projects/67890`). You can find
a folder's URI with:
```
curl -s -H "Authorization: Bearer $VIMEO_ACCESS_TOKEN" "https://api.vimeo.com/me/projects?fields=uri,name"
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
into `incoming/`. A macOS popup dialog appears (you don't need to switch to
the terminal) asking for:

- **Video title** — used as both the Vimeo title and the caption shown under the video on your site (always in sync, since it's one input).
- **Prompt** — the AI prompt used to generate the video (shown on the detail page), unless a matching `.txt` sidecar file was found (see below).

Using a real dialog box (instead of a terminal prompt) means pasting a long,
multi-paragraph prompt won't get silently truncated.

### Long prompts: sidecar `.txt` files

Optionally, drop a text file with the same name as the video (e.g. `myclip.mp4`
+ `myclip.txt`) into `incoming/` before or alongside the video. If found, its
contents are used as the prompt automatically and you won't be asked for it —
useful if you want to compose/edit the prompt in a text editor first, or reuse
one across similar clips.

The script then:

1. Uploads the video to Vimeo (and files it into `VIMEO_FOLDER_URI` if set).
2. Waits for Vimeo to finish transcoding.
3. Adds an entry to `docs/videos.json` and generates `docs/prompts/<slug>.html`.
4. Moves the source file from `incoming/` to `uploaded/` (kept locally as a backup, not uploaded to git).
5. Commits and pushes `docs/` to GitHub, which republishes the Pages site — your
   Cargo page picks up the new video on next page load.

To preview the gallery locally before it's live, run a static server against
`docs/` (e.g. `npx serve docs`) and open `index.html`.

### Re-titling a video

```
npm run rename
```

Pick a video from the list, type a new title — it updates the Vimeo title and
the site caption together (they're always the same value), regenerates the
prompt page, and pushes.

### Deleting a video

```
npm run delete
```

Pick a video, confirm — it's permanently deleted from Vimeo, removed from
`docs/videos.json`, its prompt page is deleted, and the change is pushed. This
can't be undone.

## Notes

- If `git push` fails (e.g. no remote configured yet, or you need to authenticate),
  the script will tell you and leave the commit in place — just push manually.
- Vimeo transcoding can take a minute or two for longer clips; the script waits
  up to ~100 seconds before moving on. If it's still processing, the Vimeo player
  embed will simply show a brief loading state until it's ready.
