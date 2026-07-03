import "dotenv/config";
import prompts from "prompts";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

import { deleteVideo } from "../lib/vimeo.js";
import { readManifest, removeVideoEntry } from "../lib/manifest.js";
import { publish } from "../lib/publish.js";

const PROMPTS_DIR = fileURLToPath(new URL("../docs/prompts", import.meta.url));

const videos = readManifest();

if (!videos.length) {
  console.log("No videos in docs/videos.json yet.");
  process.exit(0);
}

const { slug } = await prompts({
  type: "select",
  name: "slug",
  message: "Which video do you want to permanently delete?",
  choices: videos.map((v) => ({ title: v.caption, value: v.slug })),
});

if (!slug) process.exit(0);

const video = videos.find((v) => v.slug === slug);

const { confirmed } = await prompts({
  type: "confirm",
  name: "confirmed",
  message: `Delete "${video.caption}" from Vimeo AND your site? This can't be undone.`,
  initial: false,
});

if (!confirmed) {
  console.log("Cancelled.");
  process.exit(0);
}

console.log("Deleting from Vimeo...");
await deleteVideo(`/videos/${video.vimeoId}`);

removeVideoEntry(slug);

const promptPagePath = join(PROMPTS_DIR, `${slug}.html`);
if (existsSync(promptPagePath)) unlinkSync(promptPagePath);

publish(`Delete video: ${slug}`);

console.log(`Done. "${video.caption}" is gone from Vimeo and your site.`);
