/**
 * Deletes `.next` then starts `next dev` in one process (avoids partial deletes while Next is running).
 * Stop any existing `next dev` first (Ctrl+C), then: npm run dev:clean
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next");
} catch (e) {
  console.warn("Could not remove .next (is another dev server still running?)", e.message);
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code) => process.exit(code ?? 0));
