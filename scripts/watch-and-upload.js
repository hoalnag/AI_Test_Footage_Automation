import "dotenv/config";
import chokidar from "chokidar";
import prompts from "prompts";
import { renameSync, existsSync, mkdirSync, readFileSync } from "fs";
import { basename, join, extname } from "path";
import { fileURLToPath } from "url";

import { uploadVideo, waitUntilAvailable, moveToFolder } from "../lib/vimeo.js";
import { readManifest, addVideoEntry, makeSlug } from "../lib/manifest.js";
import { writePromptPage } from "../lib/promptPage.js";
import { publish } from "../lib/publish.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INCOMING_DIR = join(ROOT, "incoming");
const UPLOADED_DIR = join(ROOT, "uploaded");
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);

if (!existsSync(UPLOADED_DIR)) mkdirSync(UPLOADED_DIR, { recursive: true });

console.log(`Watching ${INCOMING_DIR} for new video files...`);
console.log("Drop a video in that folder to start the upload flow. Ctrl+C to stop.\n");

const watcher = chokidar.watch(INCOMING_DIR, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 200 },
});

watcher.on("add", (filePath) => {
  if (!VIDEO_EXTENSIONS.has(extname(filePath).toLowerCase())) return;
  processVideo(filePath).catch((err) => {
    console.error(`\nFailed to process ${basename(filePath)}:`, err.message);
  });
});

async function processVideo(filePath) {
  const fileName = basename(filePath);
  console.log(`\nNew file detected: ${fileName}`);

  const sidecarPath = filePath.slice(0, -extname(filePath).length) + ".txt";
  const hasSidecar = existsSync(sidecarPath);
  const promptFromFile = hasSidecar ? readFileSync(sidecarPath, "utf8").trim() : null;

  if (hasSidecar) {
    console.log(`Using prompt text from ${basename(sidecarPath)}`);
  } else {
    console.log("Tip: for long prompts, drop a matching .txt file next to the video instead of pasting here — long terminal pastes can get silently truncated.");
  }

  const questions = [
    {
      type: "text",
      name: "caption",
      message: "Video title (used as the Vimeo title AND the caption on your site)",
      validate: (v) => (v.trim() ? true : "Required"),
    },
  ];
  if (!hasSidecar) {
    questions.push({
      type: "text",
      name: "prompt",
      message: "AI prompt used to generate this video",
      validate: (v) => (v.trim() ? true : "Required"),
    });
  }

  const answers = await prompts(questions);
  const prompt = promptFromFile || answers.prompt;

  if (!answers.caption || !prompt) {
    console.log("Skipped (no title/prompt provided).");
    return;
  }

  console.log("Uploading to Vimeo...");
  const { uri, id } = await uploadVideo(filePath, {
    name: answers.caption,
    description: prompt,
  });
  console.log(`\nUploaded: ${uri}`);

  console.log("Filing into the Vimeo folder...");
  await moveToFolder(uri);

  console.log("Waiting for Vimeo to finish transcoding (this can take a minute)...");
  const ready = await waitUntilAvailable(uri);
  if (!ready) {
    console.log("Still transcoding after the wait — it'll finish in the background; the embed will work once it's done.");
  }

  const existing = readManifest();
  const slug = makeSlug(answers.caption, existing);
  const uploadedAt = new Date().toISOString();

  addVideoEntry({
    slug,
    vimeoId: id,
    caption: answers.caption,
    prompt,
    uploadedAt,
  });

  writePromptPage({
    slug,
    caption: answers.caption,
    prompt,
    vimeoId: id,
    uploadedAt,
    galleryUrl: process.env.GALLERY_URL,
  });

  renameSync(filePath, join(UPLOADED_DIR, fileName));
  if (hasSidecar) renameSync(sidecarPath, join(UPLOADED_DIR, basename(sidecarPath)));

  publish(`Add video: ${fileName}`);

  console.log(`Done. "${answers.caption}" is live in docs/videos.json (slug: ${slug}).\n`);
  console.log(`Watching ${INCOMING_DIR} for the next video...\n`);
}
