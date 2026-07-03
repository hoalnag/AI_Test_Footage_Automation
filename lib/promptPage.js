import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const PROMPTS_DIR = fileURLToPath(new URL("../docs/prompts", import.meta.url));

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Writes docs/prompts/<slug>.html describing the video's AI prompt. */
export function writePromptPage({ slug, caption, prompt, vimeoId, uploadedAt }) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(caption)} — Prompt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 720px; margin: 4rem auto; padding: 0 1.5rem; color: #111; line-height: 1.6; }
    a.back { display: inline-block; margin-bottom: 2rem; color: #666; text-decoration: none; }
    a.back:hover { text-decoration: underline; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    time { color: #888; font-size: 0.875rem; }
    .prompt { margin-top: 1.5rem; padding: 1.25rem; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap; }
    .video { margin-top: 1.5rem; aspect-ratio: 16/9; }
    .video iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <a class="back" href="../index.html">&larr; Back to gallery</a>
  <h1>${escapeHtml(caption)}</h1>
  <time datetime="${uploadedAt}">${new Date(uploadedAt).toLocaleDateString()}</time>
  <div class="video">
    <iframe src="https://player.vimeo.com/video/${vimeoId}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
  </div>
  <h2>Prompt</h2>
  <div class="prompt">${escapeHtml(prompt)}</div>
</body>
</html>
`;
  writeFileSync(join(PROMPTS_DIR, `${slug}.html`), html);
}
