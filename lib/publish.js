import { execSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Commits docs/ and pushes to the configured git remote. */
export function publish(message) {
  try {
    execSync("git add docs/", { cwd: ROOT });
    execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: ROOT });
    execSync("git push", { cwd: ROOT });
    console.log("Pushed update to GitHub — GitHub Pages will refresh shortly.");
  } catch (err) {
    console.warn(
      "Could not auto-commit/push (is the git remote configured?). Run `git push` manually when ready.\n" +
        err.message
    );
  }
}
