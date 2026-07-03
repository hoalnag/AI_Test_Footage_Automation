import { readFileSync, writeFileSync, existsSync } from "fs";
import slugify from "slugify";

const MANIFEST_PATH = new URL("../docs/videos.json", import.meta.url);

export function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return [];
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function writeManifest(videos) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(videos, null, 2) + "\n");
}

/** Generates a URL-safe slug from a caption, disambiguating collisions. */
export function makeSlug(caption, existingVideos) {
  const base = slugify(caption, { lower: true, strict: true }) || "video";
  const taken = new Set(existingVideos.map((v) => v.slug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

/** Appends a new video entry to the manifest and persists it. */
export function addVideoEntry(entry) {
  const videos = readManifest();
  videos.unshift(entry);
  writeManifest(videos);
  return videos;
}
