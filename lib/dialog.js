import { execFileSync } from "child_process";

function escapeAppleScriptString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Pops up a native macOS dialog with a text field. Returns the entered text,
 * or null if the user cancelled.
 */
export function askText(message, { title = "AI Test Footage", defaultAnswer = "" } = {}) {
  const script =
    `display dialog "${escapeAppleScriptString(message)}" ` +
    `default answer "${escapeAppleScriptString(defaultAnswer)}" ` +
    `with title "${escapeAppleScriptString(title)}" ` +
    `buttons {"Cancel", "OK"} default button "OK"`;

  try {
    const result = execFileSync("osascript", ["-e", script], { encoding: "utf8" });
    const match = result.match(/text returned:([\s\S]*)$/);
    return match ? match[1].replace(/\n$/, "") : null;
  } catch {
    return null;
  }
}
