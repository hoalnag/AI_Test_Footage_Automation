import "dotenv/config";
import prompts from "prompts";

import { renameVideo } from "../lib/vimeo.js";
import { readManifest, updateVideoEntry } from "../lib/manifest.js";
import { writePromptPage } from "../lib/promptPage.js";
import { publish } from "../lib/publish.js";

const videos = readManifest();

if (!videos.length) {
  console.log("No videos in docs/videos.json yet.");
  process.exit(0);
}

const { slug } = await prompts({
  type: "select",
  name: "slug",
  message: "Which video do you want to re-title?",
  choices: videos.map((v) => ({ title: v.caption, value: v.slug })),
});

if (!slug) process.exit(0);

const video = videos.find((v) => v.slug === slug);

const { title } = await prompts({
  type: "text",
  name: "title",
  message: "New title (used as the Vimeo title AND the caption on your site)",
  initial: video.caption,
  validate: (v) => (v.trim() ? true : "Required"),
});

if (!title) process.exit(0);

console.log("Renaming on Vimeo...");
await renameVideo(`/videos/${video.vimeoId}`, title);

const updated = updateVideoEntry(slug, { caption: title });

writePromptPage({
  slug: updated.slug,
  caption: updated.caption,
  prompt: updated.prompt,
  vimeoId: updated.vimeoId,
  uploadedAt: updated.uploadedAt,
});

publish(`Rename video: ${slug} -> "${title}"`);

console.log(`Done. "${title}" is now the title everywhere.`);
