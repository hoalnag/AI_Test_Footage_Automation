import { Vimeo } from "@vimeo/vimeo";

function getClient() {
  const { VIMEO_CLIENT_ID, VIMEO_CLIENT_SECRET, VIMEO_ACCESS_TOKEN } = process.env;
  if (!VIMEO_ACCESS_TOKEN) {
    throw new Error(
      "Missing VIMEO_ACCESS_TOKEN in .env. See README.md for how to create one."
    );
  }
  return new Vimeo(VIMEO_CLIENT_ID, VIMEO_CLIENT_SECRET, VIMEO_ACCESS_TOKEN);
}

/**
 * Uploads a local video file to Vimeo and returns { uri, id }.
 * uri looks like "/videos/123456789".
 */
export function uploadVideo(filePath, { name, description }) {
  const client = getClient();

  return new Promise((resolve, reject) => {
    client.upload(
      filePath,
      { name, description },
      (uri) => {
        const id = uri.split("/").pop();
        resolve({ uri, id });
      },
      (bytesUploaded, bytesTotal) => {
        const pct = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
        process.stdout.write(`\r  uploading... ${pct}%`);
      },
      (error) => {
        reject(new Error(`Vimeo upload failed: ${error}`));
      }
    );
  });
}

/** Moves a video into a Vimeo folder (project). No-op if VIMEO_FOLDER_URI isn't set. */
export function moveToFolder(videoUri) {
  const folderUri = process.env.VIMEO_FOLDER_URI;
  if (!folderUri) return Promise.resolve();

  const client = getClient();
  const videoId = videoUri.split("/").pop();

  return new Promise((resolve, reject) => {
    client.request(
      { method: "PUT", path: `${folderUri}/videos/${videoId}` },
      (error) => {
        if (error) return reject(new Error(`Failed to move video into folder: ${error}`));
        resolve();
      }
    );
  });
}

/** Renames a video's title on Vimeo. */
export function renameVideo(videoUri, name) {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.request({ method: "PATCH", path: videoUri, query: { name } }, (error) => {
      if (error) return reject(new Error(`Failed to rename video: ${error}`));
      resolve();
    });
  });
}

/** Permanently deletes a video from Vimeo. */
export function deleteVideo(videoUri) {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.request({ method: "DELETE", path: videoUri }, (error) => {
      if (error) return reject(new Error(`Failed to delete video: ${error}`));
      resolve();
    });
  });
}

/**
 * Polls Vimeo until the video has finished transcoding (status "available"),
 * or gives up after maxAttempts.
 */
export async function waitUntilAvailable(uri, { maxAttempts = 20, intervalMs = 5000 } = {}) {
  const client = getClient();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await new Promise((resolve, reject) => {
      client.request({ method: "GET", path: uri, query: { fields: "transcode.status" } }, (error, body) => {
        if (error) return reject(error);
        resolve(body?.transcode?.status);
      });
    });

    if (status === "complete") return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}
