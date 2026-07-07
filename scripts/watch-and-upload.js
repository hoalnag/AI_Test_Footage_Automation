import "dotenv/config";
import chokidar from "chokidar";
import { renameSync, existsSync, mkdirSync, readFileSync } from "fs";
import { basename, join, extname } from "path";
import { fileURLToPath } from "url";

import { uploadVideo, waitUntilAvailable, moveToFolder } from "../lib/vimeo.js";
import { readManifest, addVideoEntry, makeSlug } from "../lib/manifest.js";
import { writePromptPage } from "../lib/promptPage.js";
import { publish } from "../lib/publish.js";
import { askText } from "../lib/dialog.js";

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

  if (hasSidecar) console.log(`Using prompt text from ${basename(sidecarPath)}`);

  console.log("Waiting for you to fill in a popup dialog...");
  const caption = askText(`Video title for "${fileName}"\n(used as the Vimeo title AND the caption on your site)`, {
    title: "New Test Footage",
  });

  if (!caption || !caption.trim()) {
    console.log("Skipped (no title provided).");
    return;
  }

  let prompt = promptFromFile;
  if (!prompt) {
    prompt = askText("AI prompt used to generate this video", { title: "New Test Footage" });
  }

  if (!prompt || !prompt.trim()) {
    console.log("Skipped (no prompt provided).");
    return;
  }

  console.log("Uploading to Vimeo...");
  const { uri, id } = await uploadVideo(filePath, {
    name: caption,
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
  const slug = makeSlug(caption, existing);
  const uploadedAt = new Date().toISOString();

  addVideoEntry({
    slug,
    vimeoId: id,
    caption,
    prompt,
    uploadedAt,
  });

  writePromptPage({
    slug,
    caption,
    prompt,
    vimeoId: id,
    uploadedAt,
    galleryUrl: process.env.GALLERY_URL,
  });

  renameSync(filePath, join(UPLOADED_DIR, fileName));
  if (hasSidecar) renameSync(sidecarPath, join(UPLOADED_DIR, basename(sidecarPath)));

  publish(`Add video: ${fileName}`);

  console.log(`Done. "${caption}" is live in docs/videos.json (slug: ${slug}).\n`);
  console.log(`Watching ${INCOMING_DIR} for the next video...\n`);
}
